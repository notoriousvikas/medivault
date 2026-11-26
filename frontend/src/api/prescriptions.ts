import api from './client';

export const prescriptionsApi = {
  getPrescriptions: async () => {
    const res = await api.get('/prescriptions');
    return res.data;
  },

  getPrescription: async (id: string) => {
    const res = await api.get(`/prescriptions/${id}`);
    return res.data;
  },

  createPrescription: async (data: FormData | Record<string, any>) => {
    const res = await api.post('/prescriptions', data);
    return res.data;
  },

  updatePrescription: async (id: string, data: FormData | Record<string, any>) => {
    const res = await api.patch(`/prescriptions/${id}`, data);
    return res.data;
  },

  deletePrescription: async (id: string) => {
    const res = await api.delete(`/prescriptions/${id}`);
    return res.data;
  },

  analyzePrescription: async (id: string) => {
    const res = await api.post(`/prescriptions/${id}/analyze`);
    return res.data;
  },
};
