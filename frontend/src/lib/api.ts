import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      console.log('API Request Interceptor:', {
        url: config.url,
        method: config.method?.toUpperCase(),
        tokenPresent: !!token,
        tokenLength: token?.length || 0,
        headers: config.headers
      });
      
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        console.log('API Request - Authorization header added:', token.substring(0, 20) + '...');
      } else {
        console.log('API Request - No token found in localStorage');
      }
    }
    return config;
  },
  (error) => {
    console.error('API Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error:', error.response?.status, error.response?.data, 'URL:', error.config?.url);
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.log('401 Unauthorized - redirecting to login');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      console.log('403 Forbidden - access denied');
    }
    return Promise.reject(error);
  }
);

export default api;
