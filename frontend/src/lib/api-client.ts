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

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and auto-save
apiClient.interceptors.response.use(
  (response) => {
    // Auto-save token from response Authorization header
    const authHeader = response.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      Cookies.set('jwt_token', token, { expires: 1 });
    }
    
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, remove it and redirect to login
      Cookies.remove('jwt_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions for deliveries
export const deliveryApi = {
  // Get all deliveries
  getDeliveries: async () => {
    const response = await apiClient.get('/deliveries');
    return response.data;
  },

  // Get delivery by ID
  getDelivery: async (id: number) => {
    const response = await apiClient.get(`/deliveries/${id}`);
    return response.data;
  },

  // Create new delivery
  createDelivery: async (data: any) => {
    const response = await apiClient.post('/deliveries', data);
    return response.data;
  },

  // Update delivery status
  updateDeliveryStatus: async (id: number, status: string) => {
    const response = await apiClient.patch(`/deliveries/${id}`, { status });
    return response.data;
  },

  // Update delivery (full update)
  updateDelivery: async (id: number, data: any) => {
    const response = await apiClient.put(`/deliveries/${id}`, data);
    return response.data;
  },

  // Delete delivery
  deleteDelivery: async (id: number) => {
    const response = await apiClient.delete(`/deliveries/${id}`);
    return response.data;
  },

  // Print delivery PDF
  printDeliveryPdf: async (id: number) => {
    const response = await apiClient.get(`/deliveries/${id}/print`, {
      responseType: 'blob'
    });
    return response;
  },
};

export default apiClient;
