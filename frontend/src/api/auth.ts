import api from './client';

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/users/login', { email, password });
    return res.data;
  },

  register: async (userData: Record<string, any>) => {
    const res = await api.post('/users/register', userData);
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/users/me');
    return res.data;
  },

  updateProfile: async (id: string, data: Record<string, any>) => {
    const res = await api.patch(`/users/${id}`, data);
    return res.data;
  },
};
