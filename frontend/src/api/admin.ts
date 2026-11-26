import api from './client';

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

  verifyDoctor: async (id: string, status: string, notes = '') => {
    const res = await api.patch(`/admin/doctors/${id}/verify`, { status, notes });
    return res.data;
  },

  getAllUsers: async () => {
    const res = await api.get('/admin/users');
    return res.data;
  },

  updateUserRole: async (id: string, role: string) => {
    const res = await api.patch(`/admin/users/${id}/role`, { role });
    return res.data;
  },

  deleteUser: async (id: string) => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  },
};
