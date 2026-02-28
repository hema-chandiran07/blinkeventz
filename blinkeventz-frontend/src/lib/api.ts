// src/lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token if available
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('blinkeventz_user');
      if (user) {
        try {
          const parsedUser = JSON.parse(user);
          if (parsedUser.token) {
            config.headers.Authorization = `Bearer ${parsedUser.token}`;
          }
        } catch (error) {
          console.error('Failed to parse user from localStorage', error);
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear user data and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('blinkeventz_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
