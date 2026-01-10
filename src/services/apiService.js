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
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
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

  async refreshToken() {
    return this.request('/auth/refresh', {
      method: 'POST',
    });
  }

  // Members methods
  async getMembers() {
    return this.request('/members');
  }

  async getMember(id) {
    return this.request(`/members/${id}`);
  }

  async createMember(memberData) {
    return this.request('/members', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  async updateMember(id, memberData) {
    return this.request(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(memberData),
    });
  }

  async deleteMember(id) {
    return this.request(`/members/${id}`, {
      method: 'DELETE',
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

  async createSession(sessionData) {
    // Transform frontend sessionPassword to backend secretQuestion/secretAnswer format
    const backendData = {
      ...sessionData,
      secretQuestion: 'What is the session password?',
      secretAnswer: sessionData.sessionPassword,
    };
    
    // Remove the frontend-specific field
    delete backendData.sessionPassword;
    
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
  }

  async updateSession(id, sessionData) {
    // Transform frontend sessionPassword to backend secretQuestion/secretAnswer format
    const backendData = { ...sessionData };
    
    if (sessionData.sessionPassword !== undefined) {
      backendData.secretQuestion = 'What is the session password?';
      backendData.secretAnswer = sessionData.sessionPassword;
      delete backendData.sessionPassword;
    }
    
    return this.request(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(backendData),
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
  async checkInWithPin(sessionId, pin) {
    return this.request('/checkin/pin', {
      method: 'POST',
      body: JSON.stringify({ sessionId, pin }),
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
}

export const apiService = new ApiService();
export default apiService;