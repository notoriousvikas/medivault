import api from './client.js';

export const recordsApi = {
  getRecords: async () => {
    const res = await api.get('/records');
    return res.data;
  },

  getRecord: async (id) => {
    const res = await api.get(`/records/${id}`);
    return res.data;
  },

  createRecord: async (data, onProgress) => {
    const isFormData = data instanceof FormData;
    const res = await api.post('/records', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return res.data;
  },

  updateRecord: async (id, data) => {
    const isFormData = data instanceof FormData;
    const res = await api.patch(`/records/${id}`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return res.data;
  },

  deleteRecord: async (id) => {
    const res = await api.delete(`/records/${id}`);
    return res.data;
  },

  analyzeRecord: async (id) => {
    // Groq RAG medical report analysis endpoint
    const res = await api.post(`/records/${id}/analyze`);
    return res.data;
  },
};
