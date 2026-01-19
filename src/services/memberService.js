import axios from 'axios';
import { authService } from './authService';
import vercelEmailService from './vercelEmailService.js';
import apiService from './apiService.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
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

export const memberService = {
  async getAllMembers() {
    try {
      const response = await api.get('/members');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch members');
    }
  },

  async getMember(id) {
    try {
      const response = await api.get(`/members/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch member');
    }
  },

  async createMember(memberData) {
    try {
      const response = await api.post('/members', memberData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create member');
    }
  },

  async updateMember(id, memberData) {
    try {
      const response = await api.put(`/members/${id}`, memberData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update member');
    }
  },

  async deleteMember(id) {
    try {
      const response = await api.delete(`/members/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete member');
    }
  },

  async uploadMembers(formData, onProgress) {
    try {
      const response = await api.post('/members/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          if (onProgress) onProgress(percentCompleted);
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to upload members');
    }
  },

  async downloadTemplate() {
    try {
      const response = await api.get('/members/template', {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'member-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to download template');
    }
  },

  async resendPin(id) {
    try {
      // Use apiService which now uses Vercel email service
      return await apiService.resendPin(id);
    } catch (error) {
      throw new Error(error.message || 'Failed to resend PIN');
    }
  },

  async toggleStatus(id) {
    try {
      const response = await api.patch(`/members/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update member status');
    }
  },

  async searchMembers(query) {
    try {
      const response = await api.get(`/members/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to search members');
    }
  },

  async getMemberAttendance(id, options = {}) {
    try {
      const params = new URLSearchParams(options);
      const response = await api.get(`/members/${id}/attendance?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch member attendance');
    }
  },
};