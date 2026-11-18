import api from './client.js';

export const emergencyApi = {
  getMyProfile: async () => {
    const res = await api.get('/emergency/me');
    return res.data;
  },

  getQRCode: async () => {
    const res = await api.get('/emergency/me/qr');
    return res.data;
  },

  updateEmergencyInfo: async (info) => {
    const res = await api.patch('/emergency/me', info);
    return res.data;
  },

  regenerateToken: async () => {
    const res = await api.post('/emergency/me/regenerate-token');
    return res.data;
  },

  getAccessLogs: async () => {
    const res = await api.get('/emergency/me/logs');
    return res.data;
  },

  // Public emergency profile by token (for first responders / QR scan)
  getByToken: async (token) => {
    const res = await api.get(`/emergency/${token}`, {
      headers: {
        Accept: 'application/json',
      },
    });
    return res.data;
  },
};
