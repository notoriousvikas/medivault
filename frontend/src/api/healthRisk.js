import api from './client.js';

export const healthRiskApi = {
  submitReport: async (payload) => {
    const res = await api.post('/health-risk/reports', payload);
    return res.data;
  },

  getMyReports: async () => {
    const res = await api.get('/health-risk/reports/my');
    return res.data;
  },

  getAlerts: async (params = {}) => {
    const res = await api.get('/health-risk/alerts', { params });
    return res.data;
  },

  getOverview: async () => {
    const res = await api.get('/health-risk/overview');
    return res.data;
  },

  getClusters: async (timeWindow = '7d') => {
    const res = await api.get('/health-risk/clusters', { params: { timeWindow } });
    return res.data;
  },

  updateAlertStatus: async (alertId, status, notes = '') => {
    const res = await api.patch(`/health-risk/alerts/${alertId}/status`, { status, notes });
    return res.data;
  },

  triggerScan: async (timeWindow = '7d') => {
    const res = await api.post('/health-risk/scan', { timeWindow });
    return res.data;
  },

  getTaxonomy: async () => {
    const res = await api.get('/health-risk/taxonomy');
    return res.data;
  },
};
