import api from './client.js';

export const jagrutiApi = {
  submitReport: async (payload) => {
    const res = await api.post('/jagruti/reports', payload);
    return res.data;
  },

  getHotspots: async (params = {}) => {
    const res = await api.get('/jagruti/hotspots', { params });
    return res.data;
  },

  getHotspotById: async (id) => {
    const res = await api.get(`/jagruti/hotspots/${id}`);
    return res.data;
  },

  getHotspotSummary: async (params = {}) => {
    const res = await api.get('/jagruti/hotspots/summary', { params });
    return res.data;
  },

  refreshHotspots: async (timeWindow = '7d') => {
    const res = await api.post('/jagruti/hotspots/refresh', { timeWindow });
    return res.data;
  },

  seedSampleHotspots: async () => {
    const res = await api.post('/jagruti/hotspots/seed-sample');
    return res.data;
  },

  getNearbyAlerts: async (params = {}) => {
    const res = await api.get('/jagruti/nearby-alerts', { params });
    return res.data;
  },

  getPreferences: async () => {
    const res = await api.get('/jagruti/preferences');
    return res.data;
  },

  updatePreferences: async (payload) => {
    const res = await api.patch('/jagruti/preferences', payload);
    return res.data;
  },
};
