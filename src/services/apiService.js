import vercelEmailService from './vercelEmailService.js';
import { apiCache } from '../utils/cache.js';
import { requestBatcher } from '../utils/requestBatcher.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Debug: Log API URL in production to help troubleshoot
if (import.meta.env.PROD) {
  console.log('🔗 API Base URL:', API_BASE_URL);
  console.log('🔗 VITE_API_URL env var:', import.meta.env.VITE_API_URL || 'NOT SET');
}

class ApiService {
  async request(endpoint, options = {}, useCache = false, useBatch = false) {
    const url = `${API_BASE_URL}${endpoint}`;
    const cacheKey = `${options.method || 'GET'}:${endpoint}`;
    const isGetRequest = !options.method || options.method === 'GET';
    
    // Check cache for GET requests (stale-while-revalidate pattern)
    if (useCache && isGetRequest) {
      const cached = apiCache.get(cacheKey);
      if (cached) {
        // If stale, return cached data but trigger background refresh
        if (cached._stale) {
          // Check if refresh is already pending
          const pending = apiCache.getPending(cacheKey);
          if (!pending) {
            // Trigger background refresh without blocking
            const refreshPromise = this._makeRequest(url, options, cacheKey, useCache, isGetRequest);
            apiCache.setPending(cacheKey, refreshPromise);
            refreshPromise.catch(() => {}); // Ignore errors in background refresh
          }
        }
        // Return cached data (even if stale)
        const { _stale, ...data } = cached;
        return data;
      }
      
      // Check if request is already pending (deduplication)
      const pending = apiCache.getPending(cacheKey);
      if (pending) {
        return pending;
      }
    }
    
    // Batch GET requests to prevent duplicate calls
    if (useBatch && isGetRequest) {
      return requestBatcher.batch(cacheKey, async () => {
        return this._makeRequest(url, options, cacheKey, useCache, isGetRequest);
      });
    }
    
    return this._makeRequest(url, options, cacheKey, useCache, isGetRequest);
  }
  
  async _makeRequest(url, options, cacheKey, useCache, isGetRequest) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`API Error Response (${url}):`, {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
        });
        
        // Check for duplicate name error (409 Conflict)
        if (response.status === 409 && (errorData.message?.includes('Name already exists') || errorData.message?.includes('name already exists'))) {
          throw new Error('A user with this name already exists');
        }
        
        // Show validation details if available
        if (errorData.details && Array.isArray(errorData.details)) {
          const detailsMsg = errorData.details.map(d => `${d.field}: ${d.message}`).join(', ');
          throw new Error(errorData.message || 'Invalid input data' + (detailsMsg ? ` - ${detailsMsg}` : ''));
        }
        
        throw new Error(errorData.message || errorData.details || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache GET requests
      if (useCache && isGetRequest) {
        apiCache.set(cacheKey, data);
      }
      
      return data;
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }
  
  // Clear cache for a specific endpoint pattern
  clearCache(pattern) {
    apiCache.clearPattern(pattern);
  }

  // Auth methods
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  async refreshToken() {
    return this.request('/auth/refresh', {
      method: 'POST',
    });
  }

  // Members methods
  async getMembers(params = {}) {
    // Build query string from params
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.query) queryParams.append('query', params.query);
    if (params.chapelRole) queryParams.append('chapelRole', params.chapelRole);
    if (params.chapelId) queryParams.append('chapelId', params.chapelId);
    
    // Use cache for GET requests (cache for 30 seconds)
    const cacheKey = `/members?${queryParams.toString()}`;
    const cached = apiCache.get(cacheKey);
    if (cached && !params.forceRefresh) {
      return cached;
    }
    
    const queryString = queryParams.toString();
    const endpoint = `/members${queryString ? `?${queryString}` : ''}`;
    // Use batching and caching for better performance
    const response = await this.request(endpoint, {}, true, true);
    
    // Transform backend 'pin' field to frontend 'memberCode' field
    if (response && response.data && response.data.members) {
      response.data.members = response.data.members.map(member => ({
        ...member,
        memberCode: member.pin,
        // Keep pin for backward compatibility but prefer memberCode
      }));
    }
    return response;
  }

  async getMember(id) {
    return this.request(`/members/${id}`);
  }

  async createMember(memberData) {
    // Transform frontend memberCode to backend pin field
    const backendData = { ...memberData };
    if (backendData.memberCode !== undefined) {
      backendData.pin = backendData.memberCode;
      delete backendData.memberCode;
    }
    
    return this.request('/members', {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
  }

  async updateMember(id, memberData) {
    // Transform frontend memberCode to backend pin field
    const backendData = { ...memberData };
    if (backendData.memberCode !== undefined) {
      backendData.pin = backendData.memberCode;
      delete backendData.memberCode;
    }
    
    return this.request(`/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(backendData),
    });
  }

  async sortUploadMembers(file) {
    const url = `${API_BASE_URL}/members/sort-upload`;
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to process sort upload');
    }
    return response.json();
  }

  async deleteMember(id) {
    return this.request(`/members/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkDeleteMembers(memberIds) {
    return this.request('/members/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ memberIds }),
    });
  }

  async toggleMemberStatus(id) {
    return this.request(`/members/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  /**
   * Resend PIN email using Vercel serverless function
   * Fetches member data first, then sends email via Vercel
   */
  async resendPin(memberId) {
    try {
      // First, fetch member data to get name, email, and pin
      const memberResponse = await this.getMember(memberId);
      const member = memberResponse.data?.member || memberResponse.data;
      
      if (!member || !member.email || !member.pin) {
        throw new Error('Member data incomplete. Missing email or PIN.');
      }

      // Build chariot details from member data
      let chariotName = 'Not assigned';
      let roleLabel = 'Member';
      let leaderName = '';
      let leaderEmail = '';
      let showLogin = false;

      if (member.chariotLeader && member.chariotLeader.length > 0) {
        roleLabel = 'Leader';
        chariotName = member.chariotLeader[0].name;
        leaderName = member.name;
        leaderEmail = member.email;
        showLogin = true;
      } else if (member.chariotAssistants && member.chariotAssistants.length > 0) {
        roleLabel = 'Assistant';
        const chariot = member.chariotAssistants[0].chariot;
        chariotName = chariot?.name || chariotName;
        leaderName = chariot?.leader?.name || '';
        leaderEmail = chariot?.leader?.email || '';
        showLogin = true;
      } else if (member.chariotMembers && member.chariotMembers.length > 0) {
        roleLabel = 'Member';
        const chariot = member.chariotMembers[0].chariot;
        chariotName = chariot?.name || chariotName;
        leaderName = chariot?.leader?.name || '';
        leaderEmail = chariot?.leader?.email || '';
      }

      // Try Vercel email service first, fallback to Railway if rate limited
      try {
        const result = await vercelEmailService.sendPinEmail({
          id: member.id,
          name: member.name,
          email: member.email,
          pin: member.pin || member.memberCode, // Support both pin and memberCode
          chariotName,
          roleLabel,
          leaderName,
          leaderEmail,
          showLogin,
          portalUrl: window.location.origin,
        });

        return {
          success: true,
          message: 'PIN email sent successfully',
          data: result,
        };
      } catch (vercelError) {
        // Check if it's a rate limit error (429 or message contains "limit")
        const isRateLimit = 
          vercelError.status === 429 ||
          vercelError.message?.includes('limit reached') ||
          vercelError.message?.includes('Sending limit');

        if (isRateLimit) {
          console.warn('Vercel rate limit reached, falling back to Railway email service');
          // Fallback to Railway backend email service
          const railwayResult = await this.request(`/members/${memberId}/resend-pin`, {
            method: 'POST',
          });
          return {
            success: true,
            message: 'PIN email sent successfully via Railway (Vercel rate limited)',
            data: railwayResult,
          };
        }
        // Re-throw if it's not a rate limit error
        throw vercelError;
      }
    } catch (error) {
      console.error('Failed to resend PIN:', error);
      throw error;
    }
  }

  /**
   * Bulk resend PIN emails using Vercel serverless function
   */
  async bulkResendPin(memberIds) {
    const results = {
      successful: 0,
      failed: 0,
      results: {
        successful: [],
        failed: [],
      },
    };

    // Process each member sequentially to avoid overwhelming the email service
    for (const memberId of memberIds) {
      try {
        await this.resendPin(memberId);
        results.successful++;
        results.results.successful.push(memberId);
      } catch (error) {
        results.failed++;
        results.results.failed.push({
          memberId,
          error: error.message || 'Unknown error',
        });
        console.error(`Failed to resend PIN for member ${memberId}:`, error);
      }
    }

    return {
      success: results.failed === 0,
      message: `Sent ${results.successful} PIN emails, ${results.failed} failed`,
      data: results,
    };
  }

  /**
   * Resend PIN emails to all active members using Vercel serverless function
   */
  async resendPinToAll() {
    try {
      // Fetch all active members in batches (max limit is 100)
      let allMembers = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await this.getMembers({ page, limit: 100 });
        const pageMembers = response?.data?.members || [];
        allMembers = [...allMembers, ...pageMembers];
        
        hasMore = pageMembers.length === 100 && (response?.data?.pagination?.hasNext || false);
        page++;
        
        // Safety limit to prevent infinite loops
        if (page > 100) break;
      }
      
      const activeMembers = allMembers.filter(m => m.isActive !== false);
      const memberIds = activeMembers.map(m => m.id);

      console.log(`Resending PIN emails to ${activeMembers.length} active members...`);

      // Use bulk resend function
      return await this.bulkResendPin(memberIds);
    } catch (error) {
      console.error('Failed to resend PINs to all members:', error);
      throw error;
    }
  }

  async resendMemberPin(id) {
    // Alias for resendPin
    return this.resendPin(id);
  }

  async bulkUploadMembers(csvData) {
    return this.request('/members/bulk-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
      },
      body: csvData,
    });
  }

  // Sessions methods
  async getSessions(params = {}) {
    const cacheKey = `/sessions${params.page ? `?page=${params.page}` : ''}`;
    if (!params.forceRefresh) {
      const cached = apiCache.get(cacheKey);
      if (cached) return cached;
    }
    
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    // Use batching and caching for better performance
    const result = await this.request(`/sessions${queryString ? `?${queryString}` : ''}`, {}, true, true);
    return result;
  }

  async getSession(id) {
    return this.request(`/sessions/${id}`);
  }

  async getSessionAttendance(id) {
    return this.request(`/sessions/${id}/attendance?includeAbsent=true`);
  }

  async markMemberPresent(sessionId, memberId) {
    return this.request(`/sessions/${sessionId}/attendance/mark-present`, {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
  }

  async getSessionChariotAttendance(sessionId) {
    return this.request(`/sessions/${sessionId}/chariot-attendance`, {}, true, true);
  }

  async exportSessionAttendanceCSV(id) {
    const url = `${API_BASE_URL}/sessions/${id}/attendance/export/csv`;
    const token = localStorage.getItem('token');
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export CSV');
    }

    return response.blob();
  }

  async exportSessionAttendancePDF(id) {
    const url = `${API_BASE_URL}/sessions/${id}/attendance/export/pdf`;
    const token = localStorage.getItem('token');
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export PDF');
    }

    return response.blob();
  }

  async createSession(sessionData) {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  async updateSession(id, sessionData) {
    return this.request(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(sessionData),
    });
  }

  async deleteSession(id) {
    // Clear cache for sessions when deleting
    apiCache.clearPattern('/sessions');
    
    return this.request(`/sessions/${id}`, {
      method: 'DELETE',
    });
  }

  async generateQRCode(sessionId) {
    return this.request(`/sessions/${sessionId}/qr`);
  }

  // Check-in methods
  async getSessionInfo(sessionId) {
    return this.request(`/checkin/${sessionId}/info`);
  }

  async verifySecretAnswer(sessionId, answer) {
    return this.request(`/checkin/${sessionId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    });
  }

  async checkInWithPin(sessionId, pin) {
    return this.request(`/checkin/${sessionId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  }

  async checkInManual(sessionId, memberData) {
    return this.request('/checkin/manual', {
      method: 'POST',
      body: JSON.stringify({ sessionId, ...memberData }),
    });
  }

  async getSessionCheckins(sessionId) {
    return this.request(`/checkin/session/${sessionId}`);
  }

  // Reports methods
  async getAnalytics(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/reports/analytics?${params}`);
  }

  async getAttendanceReport(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/reports/attendance?${params}`);
  }

  async getMemberAttendance(memberId, filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/reports/members/${memberId}?${params}`);
  }

  async getSessionReport(sessionId) {
    return this.request(`/reports/sessions/${sessionId}`);
  }

  async getAttendanceTrends(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/reports/trends?${params}`);
  }

  async exportReport(type, filters = {}) {
    const params = new URLSearchParams({ ...filters, format: 'csv' });
    return this.request(`/reports/${type}/export?${params}`);
  }

  // Dashboard methods
  async getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  // Reg-Rep management methods (admin only)
  async getRegReps() {
    return this.request('/reg-reps');
  }

  async getRegRep(id) {
    return this.request(`/reg-reps/${id}`);
  }

  async createRegRep(regRepData) {
    return this.request('/reg-reps', {
      method: 'POST',
      body: JSON.stringify(regRepData),
    });
  }

  async updateRegRep(id, regRepData) {
    return this.request(`/reg-reps/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(regRepData),
    });
  }

  async deleteRegRep(id) {
    return this.request(`/reg-reps/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleRegRepStatus(id) {
    return this.request(`/reg-reps/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  async toggleRegRepChapelAssign(id) {
    return this.request(`/reg-reps/${id}/toggle-chapel-assign`, {
      method: 'PATCH',
    });
  }

  async resetRegRepPassword(id, newPassword) {
    return this.request(`/reg-reps/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  // Chariot methods (admin only)
  async getChariots(forceRefresh = false) {
    const cacheKey = '/chariots';
    if (!forceRefresh) {
      const cached = apiCache.get(cacheKey);
      if (cached) return cached;
    }
    
    // Use batching and caching for better performance
    const result = await this.request('/chariots', {}, true, true);
    return result;
  }

  async getChariot(id) {
    return this.request(`/chariots/${id}`);
  }

  async createChariot(chariotData) {
    apiCache.clearPattern('/chariots');
    return this.request('/chariots', {
      method: 'POST',
      body: JSON.stringify(chariotData),
    });
  }

  async updateChariot(id, chariotData) {
    apiCache.clearPattern('/chariots');
    return this.request(`/chariots/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(chariotData),
    });
  }

  async deleteChariot(id) {
    apiCache.clearPattern('/chariots');
    return this.request(`/chariots/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleChariotStatus(id) {
    apiCache.clearPattern('/chariots');
    return this.request(`/chariots/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  async addChariotAssistants(chariotId, memberIds) {
    apiCache.clearPattern('/chariots');
    return this.request(`/chariots/${chariotId}/assistants`, {
      method: 'POST',
      body: JSON.stringify({ memberIds }),
    });
  }

  async removeChariotAssistants(chariotId, memberIds) {
    apiCache.clearPattern('/chariots');
    return this.request(`/chariots/${chariotId}/assistants`, {
      method: 'DELETE',
      body: JSON.stringify({ memberIds }),
    });
  }

  async addChariotMembers(chariotId, memberIds) {
    apiCache.clearPattern('/chariots');
    return this.request(`/chariots/${chariotId}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberIds }),
    });
  }

  async removeChariotMembers(chariotId, memberIds) {
    apiCache.clearPattern('/chariots');
    return this.request(`/chariots/${chariotId}/members`, {
      method: 'DELETE',
      body: JSON.stringify({ memberIds }),
    });
  }

  async exportChariotsPDF() {
    const url = `${API_BASE_URL}/chariots/export/pdf`;
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to export chariots PDF');
    }
    return response.blob();
  }

  async exportChariotsCSV() {
    const url = `${API_BASE_URL}/chariots/export/csv`;
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to export chariots CSV');
    }
    return response.blob();
  }

  async assignUnassignedMembersToChariots() {
    return this.request('/chariots/assign-unassigned', { method: 'POST' });
  }

  // Chapel methods (admin only for write, pastoral read)
  async getChapels(forceRefresh = false) {
    const cacheKey = '/chapels';
    if (!forceRefresh) {
      const cached = apiCache.get(cacheKey);
      if (cached) return cached;
    }
    return this.request('/chapels', {}, true, true);
  }

  async getChapel(id) {
    return this.request(`/chapels/${id}`);
  }

  async createChapel(chapelData) {
    apiCache.clearPattern('/chapels');
    return this.request('/chapels', {
      method: 'POST',
      body: JSON.stringify(chapelData),
    });
  }

  async updateChapel(id, chapelData) {
    apiCache.clearPattern('/chapels');
    return this.request(`/chapels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(chapelData),
    });
  }

  async deleteChapel(id) {
    apiCache.clearPattern('/chapels');
    return this.request(`/chapels/${id}`, {
      method: 'DELETE',
    });
  }

  async exportChapelsPDF() {
    const url = `${API_BASE_URL}/chapels/export/pdf`;
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to export chapels PDF');
    }
    return response.blob();
  }

  async addChapelMembers(chapelId, memberIds, role) {
    apiCache.clearPattern('/chapels');
    return this.request(`/chapels/${chapelId}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberIds, role }),
    });
  }

  async removeChapelMembers(chapelId, memberIds) {
    apiCache.clearPattern('/chapels');
    return this.request(`/chapels/${chapelId}/members`, {
      method: 'DELETE',
      body: JSON.stringify({ memberIds }),
    });
  }

  // Chariot user methods (for leaders/assistants)
  async getChariotMembers(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.query) queryParams.append('query', params.query);
    
    const queryString = queryParams.toString();
    return this.request(`/chariot/members${queryString ? `?${queryString}` : ''}`);
  }

  async getChariotSessions() {
    return this.request('/chariot/sessions');
  }

  async getChariotSession(id) {
    return this.request(`/chariot/sessions/${id}`);
  }

  async getChariotDashboardStats() {
    return this.request('/chariot/dashboard/stats');
  }

  // Chariot authentication
  async loginChariot(email, password, userType) {
    return this.request('/auth/login-chariot', {
      method: 'POST',
      body: JSON.stringify({ email, password, userType }),
    });
  }
}

export const apiService = new ApiService();
export default apiService;
