import vercelEmailService from './vercelEmailService.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Debug: Log API URL in production to help troubleshoot
if (import.meta.env.PROD) {
  console.log('🔗 API Base URL:', API_BASE_URL);
  console.log('🔗 VITE_API_URL env var:', import.meta.env.VITE_API_URL || 'NOT SET');
}

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
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
        console.error(`API Error Response (${endpoint}):`, {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
        });
        
        // Show validation details if available
        if (errorData.details && Array.isArray(errorData.details)) {
          const detailsMsg = errorData.details.map(d => `${d.field}: ${d.message}`).join(', ');
          throw new Error(errorData.message || 'Invalid input data' + (detailsMsg ? ` - ${detailsMsg}` : ''));
        }
        
        throw new Error(errorData.message || errorData.details || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
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
    
    const queryString = queryParams.toString();
    const endpoint = `/members${queryString ? `?${queryString}` : ''}`;
    const response = await this.request(endpoint);
    
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

      // Use Vercel email service instead of Railway backend
      const result = await vercelEmailService.sendPinEmail({
        id: member.id,
        name: member.name,
        email: member.email,
        pin: member.pin || member.memberCode, // Support both pin and memberCode
      });

      return {
        success: true,
        message: 'PIN email sent successfully',
        data: result,
      };
    } catch (error) {
      console.error('Failed to resend PIN via Vercel:', error);
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
      // Fetch all active members
      const membersResponse = await this.getMembers({ limit: 10000 }); // Get all members
      const members = membersResponse.data?.members || [];
      
      const activeMembers = members.filter(m => m.isActive !== false);
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
  async getSessions() {
    return this.request('/sessions');
  }

  async getSession(id) {
    return this.request(`/sessions/${id}`);
  }

  async getSessionAttendance(id) {
    return this.request(`/sessions/${id}/attendance?includeAbsent=true`);
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

  async resetRegRepPassword(id, newPassword) {
    return this.request(`/reg-reps/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }
}

export const apiService = new ApiService();
export default apiService;