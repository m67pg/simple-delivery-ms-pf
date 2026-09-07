import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
  : 'http://localhost:3001/api/v1';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token save and auth errors
apiClient.interceptors.response.use(
  (response) => {
    // Auto-save token from response Authorization header
    const authHeader = response.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      localStorage.setItem('jwt_token', token);
    }
    
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, remove it and redirect to login
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Login function
export const login = async (email: string, password: string) => {
  const response = await apiClient.post('/login', { email, password });
  
  const token = response.headers.authorization?.substring(7) || response.data.token;
  
  if (token) {
    Cookies.set('jwt_token', token, { expires: 1 });
  }
  
  return response.data;
};

// Get deliveries
export const getDeliveries = async () => {
  const response = await apiClient.get('/deliveries');
  return response.data;
};

export default apiClient;
