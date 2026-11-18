import api from './client.js';

export const chatApi = {
  getHistory: async () => {
    const res = await api.get('/chat');
    return res.data;
  },

  sendMessage: async ({ message, category = 'general', referenceId, referenceType = 'None' }) => {
    const res = await api.post('/chat', {
      message,
      category,
      referenceId,
      referenceType,
    });
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
