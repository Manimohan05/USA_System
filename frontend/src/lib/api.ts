import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a separate instance for messaging operations with extended timeout
export const messagingApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 60000, // 60 seconds for SMS operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
const addAuthToken = (config: any) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
};

// Response interceptor to handle common errors
const handleResponse = (response: any) => response;
const handleError = (error: any) => {
  // Only log unexpected errors, not business logic errors like "already marked"
  if (error.response?.status && ![400, 409].includes(error.response.status)) {
    console.log('API Error:', error.response?.status, error.response?.data, 'URL:', error.config?.url);
  }
  
  if (error.response?.status === 401 || error.response?.status === 403) {
    // Token expired, invalid, or access forbidden - redirect to login
    console.log(`${error.response?.status} ${error.response?.status === 401 ? 'Unauthorized' : 'Forbidden'} - redirecting to login`);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
};

// Apply interceptors to both instances
api.interceptors.request.use(addAuthToken, (error) => Promise.reject(error));
api.interceptors.response.use(handleResponse, handleError);

messagingApi.interceptors.request.use(addAuthToken, (error) => Promise.reject(error));
messagingApi.interceptors.response.use(handleResponse, handleError);

export default api;
