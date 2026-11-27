import api from './client';

export interface ChatSessionItem {
  _id: string;
  title: string;
  category?: string;
  referenceId?: string;
  referenceType?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  messageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SendChatMessageParams {
  message: string;
  sessionId?: string;
  category?: string;
  referenceId?: string;
  referenceType?: string;
  languageCode?: string;
}

export interface SynthesizeSpeechParams {
  text: string;
  languageCode?: string;
  speaker?: string;
  pace?: number;
}

export const chatApi = {
  getSessions: async () => {
    const res = await api.get('/chat/sessions');
    return res.data;
  },

  createSession: async (data?: {
    title?: string;
    category?: string;
    referenceId?: string;
    referenceType?: string;
  }) => {
    const res = await api.post('/chat/sessions', data || {});
    return res.data;
  },

  renameSession: async (sessionId: string, title: string) => {
    const res = await api.patch(`/chat/sessions/${sessionId}`, { title });
    return res.data;
  },

  deleteSession: async (sessionId: string) => {
    const res = await api.delete(`/chat/sessions/${sessionId}`);
    return res.data;
  },

  getHistory: async (sessionId?: string) => {
    const res = await api.get('/chat', {
      params: sessionId ? { sessionId } : undefined,
    });
    return res.data;
  },

  sendMessage: async ({
    message,
    sessionId,
    category = 'general',
    referenceId,
    referenceType = 'None',
    languageCode,
  }: SendChatMessageParams) => {
    const res = await api.post('/chat', {
      message,
      sessionId,
      category,
      referenceId,
      referenceType,
      languageCode,
    });
    return res.data;
  },

  liveTurn: async (data: FormData | Record<string, any>, isFormData = false) => {
    if (isFormData) {
      const res = await api.post('/chat/live-turn', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    }
    const res = await api.post('/chat/live-turn', data);
    return res.data;
  },

  sendVoiceMessage: async (formData: FormData) => {
    const res = await api.post('/chat/voice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  transcribeAudio: async (formData: FormData) => {
    const res = await api.post('/chat/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  synthesizeSpeech: async ({
    text,
    languageCode = 'hi-IN',
    speaker = 'shubh_enhi_ads',
    pace = 1.0,
  }: SynthesizeSpeechParams) => {
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

  clearHistory: async (sessionId?: string) => {
    const res = await api.delete('/chat', {
      params: sessionId ? { sessionId } : undefined,
    });
    return res.data;
  },

  deleteMessage: async (id: string) => {
    const res = await api.delete(`/chat/${id}`);
    return res.data;
  },
};
