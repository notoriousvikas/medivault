import api from './client.js';

export const authApi = {
  login: async (email, password) => {
    const res = await api.post('/users/login', { email, password });
    return res.data;
  },

  register: async (userData) => {
    const res = await api.post('/users/register', userData);
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/users/me');
    return res.data;
  },

  updateProfile: async (id, data) => {
    const res = await api.patch(`/users/${id}`, data);
    return res.data;
  },
};
