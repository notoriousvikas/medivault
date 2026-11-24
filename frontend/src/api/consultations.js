import api from './client.js';

export const consultationsApi = {
  getDoctors: async (params = {}) => {
    const res = await api.get('/consultations/doctors', { params });
    return res.data;
  },

  getConsultations: async () => {
    const res = await api.get('/consultations');
    return res.data;
  },

  startOrGetConsultation: async ({ doctorId, patientId, targetUserId }) => {
    const res = await api.post('/consultations', { doctorId, patientId, targetUserId });
    return res.data;
  },

  getMessages: async (consultationId) => {
    const res = await api.get(`/consultations/${consultationId}/messages`);
    return res.data;
  },

  sendMessage: async (consultationId, { text, recordAttachment }) => {
    const res = await api.post(`/consultations/${consultationId}/messages`, {
      text,
      recordAttachment,
    });
    return res.data;
  },

  getPatientQR: async () => {
    const res = await api.get('/consultations/patient-qr');
    return res.data;
  },

  scanAndAddPatient: async ({ qrData, token, patientId, patientEmail }) => {
    const res = await api.post('/consultations/scan-patient', {
      qrData,
      token,
      patientId,
      patientEmail,
    });
    return res.data;
  },
};
