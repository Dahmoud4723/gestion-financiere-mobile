import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://172.20.10.12:3001',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) await AsyncStorage.removeItem('token');
    return Promise.reject(error);
  }
);

export const comptesAPI = {
  getAll: () => api.get('/api/comptes'),
  create: (data: { nom: string; type: string; soldeInitial: number }) =>
    api.post('/api/comptes', data),
  virement: (data: {
    compteSourceId: string;
    compteDestinationId: string;
    montant: number;
    description?: string;
    dateTransaction: string;
  }) => api.post('/api/comptes/virement', data),
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
    dateTransaction: string;
  }) => api.post('/api/transactions', data),
  delete: (id: string) => api.delete(`/api/transactions/${id}`),
};

export const categoriesAPI = {
  getAll: () => api.get('/api/categories'),
  create: (data: { nom: string; type: 'ENTREE' | 'DEPENSE' }) =>
    api.post('/api/categories', data),
};

export const budgetsAPI = {
  getAll: () => api.get('/api/budgets'),
  create: (data: {
    categorieId: string;
    montantLimite: number;
    dateDebut: string;
    dateFin: string;
  }) => api.post('/api/budgets', data),
};

export const alertesAPI = {
  getAll: () => api.get('/api/alertes'),
  marquerLue: (id: string) => api.put(`/api/alertes/${id}/lue`),
};

export const profilAPI = {
  get: () => api.get('/api/profil'),
  update: (data: { nom?: string; email?: string }) =>
    api.put('/api/profil', data),
  updatePassword: (data: { ancienMotDePasse: string; nouveauMotDePasse: string }) =>
    api.put('/api/profil/mot-de-passe', data),
};
export const authAPI = {
  login: (email: string, motDePasse: string) =>
    api.post('/api/auth/connexion', { email, motDePasse }),
  register: (nom: string, email: string, motDePasse: string, organisationId: string) =>
    api.post('/api/auth/register', { nom, email, motDePasse, organisationId }),
};
export const organisationsAPI = {
  getAll: () => api.get('/api/organisations'),
};

export default api;