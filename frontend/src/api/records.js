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

  uploadAndTriage: async (formData, onProgress) => {
    const res = await api.post('/records/upload-and-triage', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
    const validId = typeof id === 'object' ? (id?._id || id?.id || id?.recordId) : id;
    if (!validId || validId === 'undefined') {
      throw new Error('Valid Record ID is required for AI analysis.');
    }
    const res = await api.post(`/records/${validId}/analyze`);
    return res.data;
  },

  analyzeChestXRay: async (id, file) => {
    // TorchXRayVision DenseNet-121 inference on Python AI microservice
    let config = {};
    let payload = {};
    if (file) {
      payload = new FormData();
      payload.append('file', file);
      config = { headers: { 'Content-Type': 'multipart/form-data' } };
    }
    const res = await api.post(`/records/${id}/analyze-xray`, payload, config);
    return res.data;
  },

  analyzeDirectXRay: async (formData) => {
    const res = await api.post('/ai/analyze-xray', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  checkAiHealth: async () => {
    const res = await api.get('/ai/health');
    return res.data;
  },
};
