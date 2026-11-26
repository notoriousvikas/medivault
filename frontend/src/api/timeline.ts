import api from './client';

export const timelineApi = {
  getEvents: async () => {
    const res = await api.get('/timeline-events');
    return res.data;
  },

  createEvent: async (data: Record<string, any>) => {
    const res = await api.post('/timeline-events', data);
    return res.data;
  },

  getEvent: async (id: string) => {
    const res = await api.get(`/timeline-events/${id}`);
    return res.data;
  },

  deleteEvent: async (id: string) => {
    const res = await api.delete(`/timeline-events/${id}`);
    return res.data;
  },
};
