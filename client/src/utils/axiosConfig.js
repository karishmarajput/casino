import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const baseAxios = axios.create({
  baseURL: API_BASE_URL,
});

const adminAxios = axios.create({
  baseURL: API_BASE_URL,
});

adminAxios.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

adminAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default adminAxios;
export { baseAxios, axios as defaultAxios };

