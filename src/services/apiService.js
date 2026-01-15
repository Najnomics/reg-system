const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  async getMembers() {
    const response = await this.request('/members');
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

  async resendPin(memberId) {
    return this.request(`/members/${memberId}/resend-pin`, {
      method: 'POST',
    });
  }

  async bulkResendPin(memberIds) {
    return this.request('/members/bulk-resend-pin', {
      method: 'POST',
      body: JSON.stringify({ memberIds }),
    });
  }

  async resendPinToAll() {
    return this.request('/members/resend-pin-all', {
      method: 'POST',
    });
  }

  async resendMemberPin(id) {
    return this.request(`/members/${id}/resend-pin`, {
      method: 'POST',
    });
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