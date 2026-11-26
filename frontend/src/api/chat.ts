import api from './client';

export interface SendChatMessageParams {
  message: string;
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
  getHistory: async () => {
    const res = await api.get('/chat');
    return res.data;
  },

  sendMessage: async ({
    message,
    category = 'general',
    referenceId,
    referenceType = 'None',
    languageCode,
  }: SendChatMessageParams) => {
    const res = await api.post('/chat', {
      message,
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

  clearHistory: async () => {
    const res = await api.delete('/chat');
    return res.data;
  },

  deleteMessage: async (id: string) => {
    const res = await api.delete(`/chat/${id}`);
    return res.data;
  },
};
