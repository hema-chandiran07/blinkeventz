// src/lib/api.ts
import axios, { InternalAxiosRequestConfig } from "axios";

// Extend Axios config interface to include custom property
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    skipAuth?: boolean;
  }
}

// Direct API calls to backend - No rewrite proxy
// Works in both development and Docker environments
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Browser environment
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }
  // Server environment (Next.js SSR)
  return process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
};

const api = axios.create({
  baseURL: `${getBaseUrl()}/api`,
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor - Add auth token and handle multipart/form-data
api.interceptors.request.use(
  (config) => {
    // Skip auth header if skipAuth flag is set
    if (config.skipAuth) {
      return config;
    }

    // IMPORTANT: Let Axios auto-set Content-Type for FormData
    // Do NOT set Content-Type header for FormData - it will break file uploads
    if (config.data instanceof FormData) {
      // Remove any default Content-Type to let Axios set multipart boundary
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      // Default to JSON for other requests
      config.headers['Content-Type'] = 'application/json';
    }
    
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
    
    // Remove Content-Type header for FormData (axios will set it automatically with boundary)
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = undefined;
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
      // Handle 401 Unauthorized - token expired or invalid
      if (error.response.status === 401) {
        if (typeof window !== 'undefined') {
          // Skip redirect on auth-related pages (login, register, forgot-password, etc.)
          const currentPath = window.location.pathname;
          const isAuthPage = currentPath.includes('/login') || 
                             currentPath.includes('/register') ||
                             currentPath.includes('/forgot-password') ||
                             currentPath.includes('/reset-password') ||
                             currentPath.includes('/verify-otp') ||
                             currentPath.includes('/auth/');
          
          localStorage.removeItem('NearZro_user');
          
          // Only redirect if NOT on an auth page
          if (!isAuthPage) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }

      // Don't log 404 errors for approve/reject endpoints (mock data)
      const isApproveRejectEndpoint =
        error.config?.url?.includes('/approve') ||
        error.config?.url?.includes('/reject');

      if (error.response.status !== 404 || !isApproveRejectEndpoint) {
        console.error('API Error:', error.response.status, error.response.data);
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Network Error: Cannot connect to server');
      error.message = 'Unable to connect to server. Please ensure the backend is running.';
    } else if (error.code === 'ERR_NETWORK') {
      console.error('Network Error: Connection failed');
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
