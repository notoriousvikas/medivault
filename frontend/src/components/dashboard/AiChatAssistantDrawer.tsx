import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Sparkles,
  Send,
  Bot,
  User,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Mic,
  Volume2,
  Globe,
  Square,
  Pause,
  ArrowRight,
  PhoneCall,
  Plus,
  PanelLeft,
  MessageSquare,
  Pencil,
  Check,
  Maximize2,
  Minimize2,
  History,
} from 'lucide-react';
import { chatApi, ChatSessionItem } from '../../api/chat';
import { useToast } from '../../context/ToastContext';
import FormattedAiText from '../common/FormattedAiText';
import LiveAudioChatOverlay from './LiveAudioChatOverlay';
import { MedicalRecord } from '../../types';

// Centralized multilingual catalog supported by Sarvam Saaras & Bulbul
const SARVAM_LANGUAGES = [
  { code: 'auto', name: 'Auto-Detect', nativeName: 'Auto (Any Language)', flag: '🌐' },
  { code: 'en-IN', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'od-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
];

export interface ContextUsedItem {
  title?: string;
  docType?: string;
  snippet?: string;
  refId?: string;
}

export interface ChatMessageItem {
  _id: string;
  sessionId?: string;
  role: 'user' | 'assistant' | string;
  content: string;
  createdAt?: string;
  contextUsed?: boolean | ContextUsedItem[];
  category?: string;
  isVoice?: boolean;
  metadata?: {
    audioUrl?: string;
    languageCode?: string;
    sarvam?: {
      languageCode?: string;
    };
    [key: string]: any;
  };
}

interface AiChatAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  referenceRecord?: MedicalRecord | null;
  initialOpenLive?: boolean;
}

function formatRelativeDate(dateStr?: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function AiChatAssistantDrawer({
  isOpen,
  onClose,
  referenceRecord = null,
  initialOpenLive = false,
}: AiChatAssistantDrawerProps) {
  const toast = useToast();
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [expandedPastChatMsgId, setExpandedPastChatMsgId] = useState<string | null>(null);

  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceStage, setVoiceStage] = useState('');
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [synthesizingId, setSynthesizingId] = useState<string | null>(null);
  const [isLiveAudioOpen, setIsLiveAudioOpen] = useState(initialOpenLive);

  useEffect(() => {
    if (initialOpenLive && isOpen) {
      setIsLiveAudioOpen(true);
    }
  }, [initialOpenLive, isOpen]);

  // Audio elements and media streams
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Audio playback management
  const stopActiveAudio = () => {
    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
      activeAudioPlayerRef.current = null;
    }
    setPlayingMessageId(null);
  };

  const cancelRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
    setVoiceStage('');
  };

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    setInitialLoading(true);
    try {
      const res = await chatApi.getHistory(sessionId);
      setMessages(res.data || []);
    } catch (err: any) {
      console.warn('Could not load chat history:', err.message);
      setMessages([]);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const res = await chatApi.getSessions();
      const list: ChatSessionItem[] = res.data || [];
      setSessions(list);
      return list;
    } catch (err: any) {
      console.warn('Could not load chat sessions:', err.message);
      return [];
    }
  }, []);

  // Fetch sessions & initial active chat on open
  useEffect(() => {
    if (!isOpen) return;

    const init = async () => {
      setSessionsLoading(true);
      try {
        const list = await refreshSessions();
        if (referenceRecord) {
          // Focused on a specific record: start a fresh chat ready for that record
          setActiveSessionId(null);
          setMessages([]);
        } else if (list.length > 0) {
          const targetId =
            activeSessionId && list.some((s) => s._id === activeSessionId)
              ? activeSessionId
              : list[0]._id;
          setActiveSessionId(targetId);
          await loadSessionMessages(targetId);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      } finally {
        setSessionsLoading(false);
      }
    };

    init();

    return () => {
      stopActiveAudio();
      cancelRecording();
    };
  }, [isOpen, referenceRecord]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, voiceStage]);

  const handleNewChat = () => {
    stopActiveAudio();
    cancelRecording();
    setActiveSessionId(null);
    setMessages([]);
    setExpandedPastChatMsgId(null);
    if (!isExpanded) setIsSidebarOpen(false);
  };

  const handleSelectSession = async (sessionId: string) => {
    if (sessionId === activeSessionId) {
      if (!isExpanded) setIsSidebarOpen(false);
      return;
    }
    stopActiveAudio();
    cancelRecording();
    setActiveSessionId(sessionId);
    setExpandedPastChatMsgId(null);
    if (!isExpanded) setIsSidebarOpen(false);
    await loadSessionMessages(sessionId);
  };

  const handleStartRename = (session: ChatSessionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session._id);
    setEditingTitle(session.title);
  };

  const handleConfirmRename = async (sessionId: string, e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.stopPropagation();
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingSessionId(null);
      return;
    }
    try {
      const res = await chatApi.renameSession(sessionId, trimmed);
      const updated = res.data;
      setSessions((prev) =>
        prev.map((s) => (s._id === sessionId ? { ...s, title: updated?.title || trimmed } : s))
      );
    } catch (err: any) {
      toast.error('Rename Failed', err.message || 'Could not rename chat.');
    } finally {
      setEditingSessionId(null);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatApi.deleteSession(sessionId);
      const remaining = sessions.filter((s) => s._id !== sessionId);
      setSessions(remaining);
      if (activeSessionId === sessionId) {
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0]._id);
          await loadSessionMessages(remaining[0]._id);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
      toast.info('Chat Deleted', 'Conversation removed.');
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not delete chat.');
    }
  };

  const syncSessionFromResponse = (
    returnedSessionId?: string,
    returnedTitle?: string,
    previewText?: string
  ) => {
    if (!returnedSessionId) return;
    setActiveSessionId(returnedSessionId);
    setSessions((prev) => {
      const exists = prev.some((s) => s._id === returnedSessionId);
      if (exists) {
        const updated = prev.map((s) =>
          s._id === returnedSessionId
            ? {
                ...s,
                title: returnedTitle || s.title,
                lastMessageAt: new Date().toISOString(),
                lastMessagePreview: previewText ? previewText.slice(0, 140) : s.lastMessagePreview,
                messageCount: (s.messageCount || 0) + 2,
              }
            : s
        );
        return updated.sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
        );
      }
      return [
        {
          _id: returnedSessionId,
          title: returnedTitle || 'New Chat',
          lastMessageAt: new Date().toISOString(),
          lastMessagePreview: previewText?.slice(0, 140) || '',
          messageCount: 2,
        },
        ...prev,
      ];
    });
  };

  const playAudioData = (audioUrl: string, messageId: string) => {
    if (!audioUrl) return;

    if (playingMessageId === messageId && activeAudioPlayerRef.current) {
      stopActiveAudio();
      return;
    }

    stopActiveAudio();

    try {
      const audio = new Audio(audioUrl);
      activeAudioPlayerRef.current = audio;
      setPlayingMessageId(messageId);

      audio.onended = () => {
        setPlayingMessageId(null);
        activeAudioPlayerRef.current = null;
      };

      audio.onerror = (err) => {
        console.warn('Audio playback error:', err);
        setPlayingMessageId(null);
        activeAudioPlayerRef.current = null;
        toast.error('Playback Error', 'Could not play voice response.');
      };

      audio.play().catch((playErr) => {
        console.warn('Audio play() error:', playErr);
        setPlayingMessageId(null);
        activeAudioPlayerRef.current = null;
      });
    } catch (err) {
      console.error('Failed to init audio player:', err);
      setPlayingMessageId(null);
    }
  };

  // On-demand speech synthesis for any message
  const handlePlayMessageSpeech = async (msg: ChatMessageItem) => {
    if (!msg || !msg.content) return;

    const cached = audioCacheRef.current.get(msg._id) || msg.metadata?.audioUrl;
    if (cached) {
      playAudioData(cached, msg._id);
      return;
    }

    setSynthesizingId(msg._id);
    try {
      const msgLang =
        selectedLanguage !== 'auto'
          ? selectedLanguage
          : msg.metadata?.sarvam?.languageCode ||
            msg.metadata?.languageCode ||
            (/[\u0900-\u097F]/.test(msg.content) ? 'hi-IN' : 'en-IN');

      const res = await chatApi.synthesizeSpeech({
        text: msg.content,
        languageCode: msgLang,
      });

      if (res?.data?.audio) {
        audioCacheRef.current.set(msg._id, res.data.audio);
        playAudioData(res.data.audio, msg._id);
      } else {
        toast.error('Voice Unavailable', 'Could not synthesize speech.');
      }
    } catch (err: any) {
      toast.error('Speech Synthesis Error', err.message || 'Voice synthesis failed.');
    } finally {
      setSynthesizingId(null);
    }
  };

  // Standard Text Message Send
  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend || !textToSend.trim() || loading || isRecording) return;

    const userMsg: ChatMessageItem = {
      _id: 'temp_' + Date.now(),
      sessionId: activeSessionId || undefined,
      role: 'user',
      content: textToSend.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatApi.sendMessage({
        message: textToSend.trim(),
        sessionId: activeSessionId || undefined,
        referenceId: referenceRecord?._id || undefined,
        referenceType: referenceRecord ? 'Record' : 'None',
        languageCode: selectedLanguage !== 'auto' ? selectedLanguage : undefined,
      });

      if (res.data?.reply) {
        syncSessionFromResponse(res.data.sessionId, res.data.sessionTitle, res.data.reply);
        const assistantMsg: ChatMessageItem = {
          _id: res.data.messageId || 'asst_' + Date.now(),
          sessionId: res.data.sessionId,
          role: 'assistant',
          content: res.data.reply,
          contextUsed: res.data.contextUsed,
          category: res.data.category,
          createdAt: res.data.createdAt || new Date().toISOString(),
          metadata: res.data.metadata,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else if (activeSessionId) {
        const updated = await chatApi.getHistory(activeSessionId);
        if (updated.data) setMessages(updated.data);
      }
    } catch (err: any) {
      toast.error('AI Error', err.message || 'Aarogya assistant could not generate a response.');
    } finally {
      setLoading(false);
    }
  };

  // Submit recorded voice audio to backend voice conversation pipeline
  const submitVoiceAudio = async (audioBlob: Blob) => {
    setLoading(true);
    setVoiceStage('Listening & processing voice...');

    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('wav') ? 'wav' : 'webm';
      formData.append('audio', audioBlob, `voice_query.${ext}`);
      formData.append('languageCode', selectedLanguage);
      if (activeSessionId) {
        formData.append('sessionId', activeSessionId);
      }
      if (referenceRecord?._id) {
        formData.append('referenceId', referenceRecord._id);
        formData.append('referenceType', 'Record');
      }

      const stageTimer1 = setTimeout(() => {
        setVoiceStage('Analyzing medical context with Clinical AI...');
      }, 900);

      const stageTimer2 = setTimeout(() => {
        setVoiceStage('Synthesizing clinical voice response...');
      }, 1800);

      const res = await chatApi.sendVoiceMessage(formData);

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      const data = res.data;
      if (!data) throw new Error('No data returned from voice service.');

      syncSessionFromResponse(data.sessionId, data.sessionTitle, data.reply);

      const userMsg: ChatMessageItem = {
        _id: 'voice_u_' + Date.now(),
        sessionId: data.sessionId,
        role: 'user',
        content: data.transcript || '(Voice Recording)',
        isVoice: true,
        createdAt: new Date().toISOString(),
      };

      const asstMsgId: string = data.messageId || 'voice_a_' + Date.now();
      const asstMsg: ChatMessageItem = {
        _id: asstMsgId,
        sessionId: data.sessionId,
        role: 'assistant',
        content: data.reply,
        isVoice: true,
        contextUsed: data.contextUsed,
        createdAt: data.createdAt || new Date().toISOString(),
        metadata: data.metadata,
      };

      setMessages((prev) => [...prev, userMsg, asstMsg]);

      if (data.audio) {
        audioCacheRef.current.set(asstMsgId, data.audio);
        playAudioData(data.audio, asstMsgId);
      }
    } catch (err: any) {
      console.error('Voice conversation error:', err);
      toast.error('Voice AI Error', err.message || 'Could not complete voice interaction.');
    } finally {
      setLoading(false);
      setVoiceStage('');
      setRecordingSeconds(0);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  };

  // ── Sarvam Voice Recording & Conversation ────────────────────────────────
  const startRecording = async () => {
    if (loading || isRecording) return;

    stopActiveAudio();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error(
        'Microphone Unsupported',
        'Your browser does not support voice recording. Please use text chat.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      let options: MediaRecorderOptions = { mimeType: 'audio/webm' };
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          options = { mimeType: 'audio/ogg' };
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          options = { mimeType: 'audio/wav' };
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
          type: options.mimeType || 'audio/webm',
        });

        if (audioBlob.size > 1000) {
          await submitVoiceAudio(audioBlob);
        } else {
          toast.warning('Audio Too Short', 'Please speak into your microphone and try again.');
          setVoiceStage('');
          setLoading(false);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 29) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone permission / initialization error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error(
          'Microphone Permission Denied',
          'Please enable microphone access in your browser address bar to use voice chat.'
        );
      } else {
        toast.error('Audio Recording Error', err.message || 'Could not access microphone.');
      }
      setIsRecording(false);
    }
  };

  const handleClearCurrentChat = async () => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    if (!window.confirm('Clear messages in this chat?')) return;
    stopActiveAudio();
    try {
      await chatApi.clearHistory(activeSessionId);
      setMessages([]);
      setSessions((prev) =>
        prev.map((s) =>
          s._id === activeSessionId ? { ...s, messageCount: 0, lastMessagePreview: '' } : s
        )
      );
      audioCacheRef.current.clear();
      toast.info('Chat Cleared', 'Messages in this conversation were cleared.');
    } catch (err: any) {
      toast.error('Clear Failed', err.message || 'Could not reset chat history.');
    }
  };

  if (!isOpen) return null;

  const quickPrompts = [
    'Summarize my latest medical findings in plain language',
    'Are my current medications safe together?',
    'What precautions should I take based on my records?',
    'What did we discuss in my previous chats about my health?',
  ];

  const currentLangObj =
    SARVAM_LANGUAGES.find((l) => l.code === selectedLanguage) || SARVAM_LANGUAGES[0];

  const activeSessionObj = sessions.find((s) => s._id === activeSessionId) || null;

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleNewChat}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
        {!isExpanded && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close chat history"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Your Chats ({sessions.length})
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {sessionsLoading && sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Loading chats...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-8 px-3 text-center text-xs text-slate-400">
            No saved chats yet. Start a conversation!
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session._id === activeSessionId;
            const isEditing = editingSessionId === session._id;
            return (
              <div
                key={session._id}
                onClick={() => !isEditing && handleSelectSession(session._id)}
                className={`group rounded-xl px-2.5 py-2 cursor-pointer transition flex items-start justify-between gap-2 ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-400" />
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <form
                        onSubmit={(e) => handleConfirmRename(session._id, e)}
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          autoFocus
                          className="w-full px-1.5 py-0.5 text-xs bg-slate-950 border border-indigo-500 rounded text-white focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                          title="Save title"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="text-xs font-semibold truncate">{session.title}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {formatRelativeDate(session.lastMessageAt || session.updatedAt)}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(session, e)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700"
                      title="Rename chat"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(session._id, e)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
        <History className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span>Important facts from past chats are automatically recalled via RAG.</span>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-40 overflow-hidden bg-navy-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-6">
          <div
            className={`w-screen max-w-full bg-white shadow-2xl flex border-l border-slate-200 transition-all duration-200 relative ${
              isExpanded ? 'sm:max-w-4xl' : 'sm:max-w-md'
            }`}
          >
            {/* Docked ChatGPT Sidebar in Expanded Mode */}
            {isExpanded && (
              <div className="hidden sm:block w-64 shrink-0 border-r border-slate-800">
                {renderSidebarContent()}
              </div>
            )}

            {/* Slide-over Sidebar in Compact Mode or Mobile */}
            {isSidebarOpen && (!isExpanded || typeof window !== 'undefined') && (
              <div
                className={`absolute inset-y-0 left-0 z-30 w-64 shadow-2xl border-r border-slate-800 ${
                  isExpanded ? 'sm:hidden' : ''
                }`}
              >
                {renderSidebarContent()}
              </div>
            )}

            {/* Main Chat Column */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
              {/* Header */}
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-navy-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0 shadow-md gap-1.5 sm:gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen((v) => !v)}
                    className={`p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition shrink-0 ${
                      isExpanded ? 'sm:hidden' : ''
                    }`}
                    title="Chat History (All Chats)"
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>

                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-indigo-300 flex items-center justify-center border border-indigo-400/30 shadow-inner shrink-0">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="font-extrabold text-xs sm:text-sm text-white truncate">
                        {activeSessionObj ? activeSessionObj.title : 'New Chat'}
                      </h3>
                      <span className="hidden min-[400px]:inline-block px-1.5 py-0.5 rounded bg-indigo-500/40 text-[8px] sm:text-[9px] font-mono font-bold text-indigo-200 uppercase tracking-wider border border-indigo-400/40 shrink-0 whitespace-nowrap">
                        RAG
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-emerald-400 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="truncate">Aarogya AI &bull; Multi-Chat Memory</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="p-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white transition flex items-center gap-1 text-[11px] font-bold"
                    title="Start New Chat"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">New</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopActiveAudio();
                      setIsLiveAudioOpen(true);
                    }}
                    className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-[10px] sm:text-[11px] shadow-sm flex items-center gap-1 transition-all border border-emerald-400/40 shrink-0"
                    title="Start Continuous Hands-Free Live Audio Call"
                  >
                    <PhoneCall className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white animate-pulse" />
                    <span className="hidden min-[520px]:inline">Live</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExpanded((v) => !v)}
                    className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title={isExpanded ? 'Compact drawer' : 'Expand ChatGPT view'}
                  >
                    {isExpanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={handleClearCurrentChat}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    title="Clear current chat messages"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              {/* Reference Banner if focused on a specific record */}
              {referenceRecord && (
                <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between text-xs text-indigo-900 shrink-0">
                  <span className="font-semibold truncate">Focused: {referenceRecord.title}</span>
                  <span className="text-[10px] uppercase font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-200">
                    Target Record
                  </span>
                </div>
              )}

              {/* Language Selector Bar */}
              <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200/80 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                  <Globe className="w-3.5 h-3.5 text-trust-600" />
                  <span>Spoken Language:</span>
                </div>

                <div className="relative">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value);
                      stopActiveAudio();
                    }}
                    className="pl-2 pr-7 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-navy-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600 cursor-pointer"
                  >
                    {SARVAM_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}{' '}
                        {lang.nativeName && lang.nativeName !== lang.name
                          ? `(${lang.nativeName})`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {initialLoading ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-trust-600" />
                    <span>Loading conversation...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col justify-center text-center p-4 space-y-4 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-trust-500/10 via-indigo-500/20 to-violet-500/10 text-trust-600 flex items-center justify-center mx-auto border border-trust-200/60 shadow-xs">
                      <Sparkles className="w-7 h-7 text-trust-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-navy-900">
                        Start a New Health Conversation
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                        Each chat is kept separate like ChatGPT. Important context from your medical
                        records and previous chats is automatically recalled when relevant.
                      </p>
                    </div>

                    {/* Live Voice Call Action Banner */}
                    <button
                      type="button"
                      onClick={() => {
                        stopActiveAudio();
                        setIsLiveAudioOpen(true);
                      }}
                      className="w-full p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 hover:from-emerald-100 hover:via-teal-100 hover:to-indigo-100 border border-emerald-200/80 text-left transition flex items-center justify-between group shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm">
                          <PhoneCall className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-navy-900 flex items-center gap-1.5">
                            <span>Start Hands-Free Live Voice Call</span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-[9px] font-mono font-bold text-white uppercase">
                              Live Audio
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Speak continuously in Hindi, English, or your native language.
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition" />
                    </button>

                    {/* Prompt suggestions */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Suggested Inquiries:
                      </span>
                      {quickPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(prompt)}
                          className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-trust-50 hover:border-trust-200 border border-slate-200 text-xs text-slate-700 transition flex items-center justify-between group"
                        >
                          <span className="line-clamp-1">{prompt}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-trust-600 group-hover:translate-x-0.5 transition" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAssistant = m.role === 'assistant';
                    const isPlaying = playingMessageId === m._id;
                    const isSynthesizing = synthesizingId === m._id;
                    const contextArray = Array.isArray(m.contextUsed) ? m.contextUsed : [];
                    const pastChatSources = contextArray.filter(
                      (c) => c.docType === 'past_chat'
                    );
                    const hasRecordContext =
                      Boolean(m.contextUsed) &&
                      (typeof m.contextUsed === 'boolean' ||
                        contextArray.some((c) => c.docType !== 'past_chat'));
                    const isPastChatExpanded = expandedPastChatMsgId === m._id;

                    return (
                      <div
                        key={m._id}
                        className={`flex items-start gap-2.5 ${
                          isAssistant ? 'justify-start' : 'justify-end'
                        }`}
                      >
                        {isAssistant && (
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed transition ${
                            isAssistant
                              ? isPlaying
                                ? 'bg-trust-50 text-slate-900 rounded-tl-sm border border-trust-200 shadow-sm'
                                : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                              : 'bg-trust-600 text-white rounded-tr-sm shadow-sm'
                          }`}
                        >
                          {isAssistant ? (
                            <FormattedAiText text={m.content} />
                          ) : (
                            <div className="whitespace-pre-wrap">{m.content}</div>
                          )}

                          {isAssistant && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handlePlayMessageSpeech(m)}
                                  disabled={isSynthesizing}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                    isPlaying
                                      ? 'bg-trust-600 text-white shadow-xs'
                                      : 'bg-white border border-slate-200 text-slate-700 hover:text-navy-900 hover:bg-slate-50'
                                  }`}
                                >
                                  {isSynthesizing ? (
                                    <>
                                      <RefreshCw className="w-3 h-3 animate-spin text-trust-600" />
                                      <span>Generating Speech...</span>
                                    </>
                                  ) : isPlaying ? (
                                    <>
                                      <Pause className="w-3 h-3 text-white fill-white" />
                                      <span>Playing Audio</span>
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3 h-3 text-trust-600" />
                                      <span>Listen ({currentLangObj.nativeName})</span>
                                    </>
                                  )}
                                </button>

                                <div className="flex items-center gap-2 flex-wrap">
                                  {pastChatSources.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedPastChatMsgId(
                                          isPastChatExpanded ? null : m._id
                                        )
                                      }
                                      className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1 transition"
                                    >
                                      <History className="w-3 h-3" />
                                      <span>
                                        Recalled {pastChatSources.length} past chat
                                        {pastChatSources.length > 1 ? 's' : ''}
                                      </span>
                                    </button>
                                  )}

                                  {hasRecordContext && (
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                      <span>Grounded in records</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {isPastChatExpanded && pastChatSources.length > 0 && (
                                <div className="p-2 rounded-xl bg-white border border-indigo-100 text-[11px] text-slate-600 space-y-1">
                                  <div className="font-bold text-indigo-900 text-[10px] uppercase tracking-wider">
                                    Previous Chat Memory Used (RAG)
                                  </div>
                                  {pastChatSources.map((src, idx) => (
                                    <div key={idx} className="leading-snug">
                                      <span className="font-semibold text-slate-800">
                                        {src.title}:
                                      </span>{' '}
                                      <span>{src.snippet}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {!isAssistant && (
                          <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Live Progress / Processing Voice Indicator */}
                {loading && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-3.5 bg-slate-100 rounded-2xl rounded-tl-sm text-xs text-slate-700 space-y-1 border border-slate-200">
                      <div className="flex items-center gap-2 font-bold text-navy-900">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-trust-600" />
                        <span>
                          {voiceStage || 'Aarogya AI analyzing clinical & chat context...'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        RAG Memory &bull; Medical Intelligence &bull; Multilingual Voice
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Active Voice Recording Strip */}
              {isRecording && (
                <div className="p-3 bg-rose-50 border-t border-rose-200 flex items-center justify-between text-xs text-rose-900 shrink-0 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600" />
                    </span>
                    <span className="font-bold">
                      {currentLangObj.code === 'auto'
                        ? 'Listening (Auto-detecting language)...'
                        : `Listening in ${currentLangObj.name} (${currentLangObj.nativeName})...`}
                    </span>
                    <span className="font-mono font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
                      00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 00:30
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded-lg hover:bg-rose-100/60 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
                    >
                      <Square className="w-3 h-3 fill-white" />
                      <span>Done & Send</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Input Box Bar */}
              <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={loading}
                    title={
                      isRecording
                        ? 'Stop recording and send query'
                        : currentLangObj.code === 'auto'
                        ? 'Speak in English, Hindi, or any Indian language'
                        : `Speak in ${currentLangObj.name}`
                    }
                    className={`p-2.5 rounded-xl transition flex items-center justify-center shrink-0 ${
                      isRecording
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 animate-pulse'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300'
                    }`}
                  >
                    {isRecording ? (
                      <Square className="w-4 h-4 fill-white" />
                    ) : (
                      <Mic className="w-4 h-4 text-indigo-600" />
                    )}
                  </button>

                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      isRecording
                        ? currentLangObj.code === 'auto'
                          ? 'Listening in any language...'
                          : `Listening in ${currentLangObj.name}...`
                        : currentLangObj.code === 'auto'
                        ? 'Message Aarogya AI...'
                        : `Ask in ${currentLangObj.name} or English...`
                    }
                    disabled={loading || isRecording}
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      stopActiveAudio();
                      cancelRecording();
                      setIsLiveAudioOpen(true);
                    }}
                    disabled={loading}
                    title="Start Continuous Live Audio Call with Aarogya AI"
                    className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm transition flex items-center justify-center shrink-0 hover:scale-105 active:scale-95"
                  >
                    <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-pulse" />
                  </button>

                  <button
                    type="submit"
                    disabled={!input.trim() || loading || isRecording}
                    className="p-2 sm:p-2.5 bg-trust-600 text-white rounded-xl hover:bg-trust-700 transition disabled:opacity-40 shrink-0 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Audio Call Overlay */}
      <LiveAudioChatOverlay
        isOpen={isLiveAudioOpen}
        onClose={() => setIsLiveAudioOpen(false)}
        referenceRecord={referenceRecord}
        initialLanguage={selectedLanguage}
        sessionId={activeSessionId}
        onSessionCreated={(newSessionId, newTitle) =>
          syncSessionFromResponse(newSessionId, newTitle)
        }
        onNewMessage={(newMsg: ChatMessageItem) => setMessages((prev) => [...prev, newMsg])}
        existingMessages={messages}
      />
    </>
  );
}
