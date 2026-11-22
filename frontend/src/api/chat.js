import api from './client.js';

export const chatApi = {
  getHistory: async () => {
    const res = await api.get('/chat');
    return res.data;
  },

  sendMessage: async ({ message, category = 'general', referenceId, referenceType = 'None', languageCode }) => {
    const res = await api.post('/chat', {
      message,
      category,
      referenceId,
      referenceType,
      languageCode,
    });
    return res.data;
  },

  sendVoiceMessage: async (formData) => {
    const res = await api.post('/chat/voice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  transcribeAudio: async (formData) => {
    const res = await api.post('/chat/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  synthesizeSpeech: async ({ text, languageCode = 'hi-IN', speaker = 'shubh_enhi_ads', pace = 1.0 }) => {
    const res = await api.post('/chat/synthesize', {
      text,
      languageCode,
      speaker,
      pace,
    });
    return res.data;
  },

  getLanguages: async () => {
    const res = await api.get('/chat/languages');
    return res.data;
  },

  clearHistory: async () => {
    const res = await api.delete('/chat');
    return res.data;
  },

  deleteMessage: async (id) => {
    const res = await api.delete(`/chat/${id}`);
    return res.data;
  },
};
