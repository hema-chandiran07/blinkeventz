// src/lib/api.ts
import axios from "axios";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('NearZro_user');
      if (user) {
        try {
          const parsedUser = JSON.parse(user);
          if (parsedUser.token) {
            config.headers.Authorization = `Bearer ${parsedUser.token}`;
          }
        } catch (error) {
          console.error('Failed to parse user from localStorage', error);
          localStorage.removeItem('NearZro_user');
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors properly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Don't log 404 errors for approve/reject endpoints (mock data)
      const isApproveRejectEndpoint = 
        error.config?.url?.includes('/approve') || 
        error.config?.url?.includes('/reject');
      
      if (error.response.status !== 404 || !isApproveRejectEndpoint) {
        console.error('API Error:', error.response.status, error.response.data);
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Network Error: Cannot connect to server at', apiBaseUrl);
      error.message = 'Unable to connect to server. Please ensure the backend is running.';
    } else if (error.code === 'ERR_NETWORK') {
      console.error('Network Error: Connection failed. Base URL:', apiBaseUrl);
      error.message = 'Network error. Please check your connection.';
    } else if (error.code === 'ECONNABORTED') {
      console.error('Timeout Error: Request timed out');
      error.message = 'Request timed out. Please try again.';
    } else {
      console.error('Unknown error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
