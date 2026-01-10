import axios from 'axios';
import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authService.logout();
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export const sessionService = {
  async getAllSessions() {
    try {
      const response = await api.get('/sessions');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sessions');
    }
  },

  async getSession(id) {
    try {
      const response = await api.get(`/sessions/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch session');
    }
  },

  async createSession(sessionData) {
    try {
      const response = await api.post('/sessions', sessionData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create session');
    }
  },

  async updateSession(id, sessionData) {
    try {
      const response = await api.put(`/sessions/${id}`, sessionData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update session');
    }
  },

  async deleteSession(id) {
    try {
      const response = await api.delete(`/sessions/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete session');
    }
  },

  async getSessionAttendance(id) {
    try {
      const response = await api.get(`/sessions/${id}/attendance`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch session attendance');
    }
  },

  async getSessionStats(id) {
    try {
      const response = await api.get(`/sessions/${id}/stats`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch session stats');
    }
  },

  async downloadQRCode(id, format = 'png') {
    try {
      const response = await api.get(`/sessions/${id}/qr-code`, {
        responseType: 'blob',
        params: { format }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `session-${id}-qr.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to download QR code');
    }
  },

  async exportAttendance(id, format = 'xlsx') {
    try {
      const response = await api.get(`/sessions/${id}/export`, {
        responseType: 'blob',
        params: { format }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `session-${id}-attendance.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to export attendance');
    }
  },
};