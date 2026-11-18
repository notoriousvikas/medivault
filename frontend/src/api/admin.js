import api from './client.js';

export const adminApi = {
  getOverview: async () => {
    const res = await api.get('/admin/overview');
    return res.data;
  },

  getAllDoctors: async () => {
    const res = await api.get('/admin/doctors');
    return res.data;
  },

  getPendingDoctors: async () => {
    const res = await api.get('/admin/doctors/pending');
    return res.data;
  },

  verifyDoctor: async (id, status, notes = '') => {
    const res = await api.patch(`/admin/doctors/${id}/verify`, { status, notes });
    return res.data;
  },

  getAllUsers: async () => {
    const res = await api.get('/admin/users');
    return res.data;
  },

  updateUserRole: async (id, role) => {
    const res = await api.patch(`/admin/users/${id}/role`, { role });
    return res.data;
  },

  deleteUser: async (id) => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  },
};
