import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://192.168.100.236:3001',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, motDePasse: string) =>
    api.post('/api/auth/connexion', { email, motDePasse }),
};

export const comptesAPI = {
  getAll: () => api.get('/api/comptes'),
};

export const transactionsAPI = {
  getAll: () => api.get('/api/transactions'),
  create: (data: {
    compteId: string;
    categorieId?: string;
    montant: number;
    type: string;
    sourcePaiement: string;
    description?: string;
    date: string;
  }) => api.post('/api/transactions', data),
};

export const alertesAPI = {
  getAll: () => api.get('/api/alertes'),
  marquerLue: (id: string) => api.put(`/api/alertes/${id}/lue`),
};

export const categoriesAPI = {
  getAll: () => api.get('/api/categories'),
};

export default api;