import axios from 'axios';

// Always use relative URLs - let the proxy or ingress handle routing
// This works for both localhost (via package.json proxy) and production (via ingress)
const API_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect to login if not already on login/register/landing/pricing/subscription pages
      const publicPaths = /^\/(login|register|pricing|subscription-success|)$/;  // Includes root path
      if (!window.location.pathname.match(publicPaths)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
