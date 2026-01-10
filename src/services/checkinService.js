import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const checkinService = {
  async getSession(sessionId) {
    try {
      const response = await api.get(`/checkin/${sessionId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Session not found or no longer accepting check-ins');
      }
      if (error.response?.status === 410) {
        throw new Error('This session has ended and is no longer accepting check-ins');
      }
      if (error.response?.status === 425) {
        throw new Error('This session has not started yet');
      }
      throw new Error(error.response?.data?.message || 'Failed to load session');
    }
  },

  async submitCheckin(sessionId, data) {
    try {
      const response = await api.post(`/checkin/${sessionId}/submit`, data);
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Invalid check-in data');
      }
      if (error.response?.status === 409) {
        throw new Error('You have already checked in to this session');
      }
      if (error.response?.status === 401) {
        throw new Error('Invalid PIN');
      }
      if (error.response?.status === 404) {
        throw new Error('Member not found');
      }
      throw new Error(error.response?.data?.message || 'Check-in failed');
    }
  },

  async validatePin(pin) {
    try {
      const response = await api.post('/checkin/validate-pin', { pin });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Invalid PIN');
      }
      throw new Error(error.response?.data?.message || 'PIN validation failed');
    }
  },
};