import api from './client';

export interface StartConsultationParams {
  doctorId?: string;
  patientId?: string;
  targetUserId?: string;
}

export interface SendConsultationMessageParams {
  text?: string;
  recordAttachment?: any;
}

export interface ScanPatientParams {
  qrData?: string;
  token?: string;
  patientId?: string;
  patientEmail?: string;
}

export const consultationsApi = {
  getDoctors: async (params: Record<string, any> = {}) => {
    const res = await api.get('/consultations/doctors', { params });
    return res.data;
  },

  getConsultations: async () => {
    const res = await api.get('/consultations');
    return res.data;
  },

  startOrGetConsultation: async ({ doctorId, patientId, targetUserId }: StartConsultationParams) => {
    const res = await api.post('/consultations', { doctorId, patientId, targetUserId });
    return res.data;
  },

  getMessages: async (consultationId: string) => {
    const res = await api.get(`/consultations/${consultationId}/messages`);
    return res.data;
  },

  sendMessage: async (consultationId: string, { text, recordAttachment }: SendConsultationMessageParams) => {
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

  scanAndAddPatient: async ({ qrData, token, patientId, patientEmail }: ScanPatientParams) => {
    const res = await api.post('/consultations/scan-patient', {
      qrData,
      token,
      patientId,
      patientEmail,
    });
    return res.data;
  },
};
