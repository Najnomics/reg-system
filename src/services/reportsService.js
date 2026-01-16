import axios from 'axios';
import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

export const reportsService = {
  async getReportData(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/reports?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch report data');
    }
  },

  async getAttendanceReport(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/reports/attendance?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch attendance report');
    }
  },

  async getMemberReport(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/reports/members?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch member report');
    }
  },

  async getSessionReport(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/reports/sessions?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch session report');
    }
  },

  async getStatistics(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/reports/statistics?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch statistics');
    }
  },

  async exportReport(type = 'attendance', format = 'xlsx', filters = {}) {
    try {
      const params = new URLSearchParams({ ...filters, format });
      const response = await api.get(`/reports/export/${type}?${params}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to export report');
    }
  },

  async getDashboardStats() {
    try {
      const response = await api.get('/reports/dashboard');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch dashboard stats');
    }
  },

  async getAttendanceTrends(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/reports/trends?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch attendance trends');
    }
  },
};