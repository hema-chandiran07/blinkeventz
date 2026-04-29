// src/lib/api.ts
import axios, { InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

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
    // Browser environment: Use the local backend URL directly
    // This allows the browser to reach the API port exposed by Docker
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }
  // Server environment (Next.js SSR): Use internal Docker service name
  return process.env.API_INTERNAL_URL || 'http://api:3000';
};

const api = axios.create({
  baseURL: `${getBaseUrl()}/api/v1`,
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
    const status = error.response?.status;
    const data = error.response?.data;
    const message = data?.message || data?.error?.message;

    if (status === 401) {
      if (typeof window !== 'undefined') {
        // Only redirect to /login for non-cart routes
        // Cart API calls should fail gracefully without redirecting
        const isCartRequest = error.config?.url?.includes('/cart');
        if (!isCartRequest) {
          localStorage.removeItem('NearZro_user');
          toast.error(message || "Session expired. Please login again.");
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }

    if (status === 403) {
      // IMPORTANT: Do NOT silently redirect for 403
      // Extract and store the real reason so the page can display it
      error.message = message || "Access denied. Please contact support.";
      return Promise.reject(error);
    }

    if (status === 500) {
      // Override BOTH error.message AND data.message so no page can leak the raw 500 body
      error.message = "Something went wrong on our end. Please try again later.";
      if (error.response?.data) {
        error.response.data.message = "Something went wrong on our end. Please try again later.";
        error.response.data.error = undefined;
      }
      return Promise.reject(error);
    }

    if (!error.response) {
      // Network error — no response received at all
      error.message = "Unable to connect to server. Please check your internet connection.";
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;