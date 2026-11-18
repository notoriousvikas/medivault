import api from './client.js';

export const timelineApi = {
  getEvents: async () => {
    const res = await api.get('/timeline-events');
    return res.data;
  },

  createEvent: async (data) => {
    const res = await api.post('/timeline-events', data);
    return res.data;
  },

  getEvent: async (id) => {
    const res = await api.get(`/timeline-events/${id}`);
    return res.data;
  },

  deleteEvent: async (id) => {
    const res = await api.delete(`/timeline-events/${id}`);
    return res.data;
  },
};
