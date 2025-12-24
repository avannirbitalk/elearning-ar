import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  login: async (data) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await api.patch('/auth/profile', data);
    return response.data;
  },
  changePassword: async (data) => {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },
};

// Classroom API
export const classroomApi = {
  getAll: async () => {
    const response = await api.get('/classrooms');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/classrooms/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/classrooms', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/classrooms/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    await api.delete(`/classrooms/${id}`);
  },
  join: async (code) => {
    const response = await api.post('/classrooms/join', { code });
    return response.data;
  },
  leave: async (id) => {
    await api.delete(`/classrooms/${id}/leave`);
  },
  getStudents: async (id) => {
    const response = await api.get(`/classrooms/${id}/students`);
    return response.data;
  },
};

// Material API
export const materialApi = {
  getByClassroom: async (classroomId) => {
    const response = await api.get(`/materials/classroom/${classroomId}`);
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/materials/${id}`);
    return response.data;
  },
  create: async (classroomId, data) => {
    const response = await api.post(`/materials/classroom/${classroomId}`, data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/materials/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    await api.delete(`/materials/${id}`);
  },
  reorder: async (classroomId, materialIds) => {
    await api.post(`/materials/classroom/${classroomId}/reorder`, { materialIds });
  },
};

export default api;
