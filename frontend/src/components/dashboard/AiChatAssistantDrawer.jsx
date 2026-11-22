import React, { useState, useEffect, useRef } from 'react';
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
  MicOff,
  Volume2,
  VolumeX,
  Globe,
  Square,
  Play,
  Pause,
  ArrowRight,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { chatApi } from '../../api/chat';
import { useToast } from '../../context/ToastContext';
import FormattedAiText from '../common/FormattedAiText';

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

export default function AiChatAssistantDrawer({ isOpen, onClose, referenceRecord = null }) {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceStage, setVoiceStage] = useState('');
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [synthesizingId, setSynthesizingId] = useState(null);

  // Audio elements and media streams
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const activeAudioPlayerRef = useRef(null);
  const audioCacheRef = useRef(new Map()); // messageId -> base64/url audio

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch chat history on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchHistory = async () => {
      setInitialLoading(true);
      try {
        const res = await chatApi.getHistory();
        if (res.data) {
          setMessages(res.data);
        }
      } catch (err) {
        console.warn('Could not load chat history:', err.message);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchHistory();

    return () => {
      stopActiveAudio();
      cancelRecording();
    };
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, voiceStage]);

  // Audio playback management
  const stopActiveAudio = () => {
    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
      activeAudioPlayerRef.current = null;
    }
    setPlayingMessageId(null);
  };

  const playAudioData = (audioUrl, messageId) => {
    if (!audioUrl) return;

    // If already playing this message, toggle pause
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
  const handlePlayMessageSpeech = async (msg) => {
    if (!msg || !msg.content) return;

    // Check if we already have audio in memory or message metadata
    const cached = audioCacheRef.current.get(msg._id) || msg.metadata?.audioUrl;
    if (cached) {
      playAudioData(cached, msg._id);
      return;
    }

    // Otherwise synthesize through Sarvam Bulbul v4 Flash
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
    } catch (err) {
      toast.error('Speech Synthesis Error', err.message || 'Sarvam TTS failed.');
    } finally {
      setSynthesizingId(null);
    }
  };

  // Standard Text Message Send
  const handleSend = async (messageText) => {
    const textToSend = messageText || input;
    if (!textToSend || !textToSend.trim() || loading || isRecording) return;

    const userMsg = {
      _id: 'temp_' + Date.now(),
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
        referenceId: referenceRecord?._id || undefined,
        referenceType: referenceRecord ? 'Record' : 'None',
        languageCode: selectedLanguage !== 'auto' ? selectedLanguage : undefined,
      });

      if (res.data?.reply) {
        const assistantMsg = {
          _id: res.data.messageId || 'asst_' + Date.now(),
          role: 'assistant',
          content: res.data.reply,
          contextUsed: res.data.contextUsed,
          category: res.data.category,
          createdAt: res.data.createdAt || new Date().toISOString(),
          metadata: res.data.metadata,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const updated = await chatApi.getHistory();
        if (updated.data) setMessages(updated.data);
      }
    } catch (err) {
      toast.error('AI Error', err.message || 'Aarogya assistant could not generate a response.');
    } finally {
      setLoading(false);
    }
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

      // Select supported audio container
      let options = { mimeType: 'audio/webm' };
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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all audio tracks to turn off the microphone hardware light
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
          type: options.mimeType || 'audio/webm',
        });

        // Submit voice conversation if audio exists
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

      // Live timer (Sarvam Saaras v4 supports up to 30 seconds per query)
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 29) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
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

  // Submit recorded voice audio to backend voice conversation pipeline
  const submitVoiceAudio = async (audioBlob) => {
    setLoading(true);
    setVoiceStage('Transcribing with Sarvam Saaras v4...');

    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('wav') ? 'wav' : 'webm';
      formData.append('audio', audioBlob, `voice_query.${ext}`);
      formData.append('languageCode', selectedLanguage);
      if (referenceRecord?._id) {
        formData.append('referenceId', referenceRecord._id);
        formData.append('referenceType', 'Record');
      }

      // Progression stage updates
      const stageTimer1 = setTimeout(() => {
        setVoiceStage('Analyzing health context with Groq LLM...');
      }, 900);

      const stageTimer2 = setTimeout(() => {
        setVoiceStage('Synthesizing voice response with Sarvam Bulbul v4...');
      }, 1800);

      const res = await chatApi.sendVoiceMessage(formData);

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      const data = res.data;
      if (!data) throw new Error('No data returned from voice service.');

      // 1. Add user transcribed question
      const userMsg = {
        _id: 'voice_u_' + Date.now(),
        role: 'user',
        content: data.transcript || '(Voice Recording)',
        isVoice: true,
        createdAt: new Date().toISOString(),
      };

      // 2. Add assistant voice answer
      const asstMsgId = data.messageId || 'voice_a_' + Date.now();
      const asstMsg = {
        _id: asstMsgId,
        role: 'assistant',
        content: data.reply,
        isVoice: true,
        contextUsed: data.contextUsed,
        createdAt: data.createdAt || new Date().toISOString(),
        metadata: data.metadata,
      };

      setMessages((prev) => [...prev, userMsg, asstMsg]);

      // Cache and auto-play the voice response
      if (data.audio) {
        audioCacheRef.current.set(asstMsgId, data.audio);
        playAudioData(data.audio, asstMsgId);
      }
    } catch (err) {
      console.error('Voice conversation error:', err);
      toast.error('Voice AI Error', err.message || 'Could not complete Sarvam voice interaction.');
    } finally {
      setLoading(false);
      setVoiceStage('');
      setRecordingSeconds(0);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all conversation history?')) return;
    stopActiveAudio();
    try {
      await chatApi.clearHistory();
      setMessages([]);
      audioCacheRef.current.clear();
      toast.info('Chat Cleared', 'Conversational memory reset.');
    } catch (err) {
      toast.error('Clear Failed', err.message || 'Could not reset chat history.');
    }
  };

  if (!isOpen) return null;

  const quickPrompts = [
    'Summarize my latest medical findings in plain language',
    'Are my current medications safe together?',
    'What precautions should I take based on my records?',
    'What questions should I ask my doctor?',
  ];

  const currentLangObj =
    SARVAM_LANGUAGES.find((l) => l.code === selectedLanguage) || SARVAM_LANGUAGES[0];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-navy-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-navy-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-indigo-300 flex items-center justify-center border border-indigo-400/30 shadow-inner">
                <Sparkles className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-white">Aarogya AI Copilot</h3>
                  <span className="px-1.5 py-0.2 rounded bg-indigo-500/40 text-[9px] font-mono font-bold text-indigo-200 uppercase tracking-wider border border-indigo-400/40">
                    Voice + RAG
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Groq LLM &bull; Sarvam AI Multilingual Voice</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
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
                    {lang.flag} {lang.name} {lang.nativeName && lang.nativeName !== lang.name ? `(${lang.nativeName})` : ''}
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
                <span>Loading conversational memory...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center text-center p-4 space-y-4">
                <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-trust-500/10 via-indigo-500/20 to-violet-500/10 text-trust-600 flex items-center justify-center mx-auto border border-trust-200/60 shadow-xs">
                  <Sparkles className="w-7 h-7 text-trust-600" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-navy-900">
                    Aarogya Multilingual Health Copilot
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    Ask questions about your health, lab reports, or scans in{' '}
                    <strong>
                      {currentLangObj.code === 'auto'
                        ? 'English, Hindi, or any Indian language'
                        : currentLangObj.name}
                    </strong>
                    . Speak using the microphone or type below.
                  </p>
                </div>

                {/* Prompt suggestions */}
                <div className="space-y-1.5 pt-2">
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
                const hasAudio = Boolean(audioCacheRef.current.get(m._id) || m.metadata?.audioUrl);

                return (
                  <div
                    key={m._id}
                    className={`flex items-start gap-2.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
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
                      {/* Message Content */}
                      {isAssistant ? (
                        <FormattedAiText text={m.content} />
                      ) : (
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      )}

                      {/* Assistant Actions Bar: Play Voice & Grounding Audit */}
                      {isAssistant && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                          {/* Audio Playback Button */}
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
                                <span className="flex items-center gap-0.5 ml-1">
                                  <span className="w-1 h-2 bg-white animate-pulse" />
                                  <span className="w-1 h-3 bg-white animate-pulse" />
                                  <span className="w-1 h-1.5 bg-white animate-pulse" />
                                </span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 text-trust-600" />
                                <span>Listen ({currentLangObj.nativeName})</span>
                              </>
                            )}
                          </button>

                          {m.contextUsed && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Grounded in records</span>
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
                      {voiceStage || 'Aarogya AI analyzing clinical context...'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Multilingual pipeline: Sarvam Saaras v4 &bull; Groq LLM &bull; Sarvam Bulbul v4 Flash
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Active Voice Recording Strip (when mic is actively listening) */}
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
              {/* Voice Microphone Button */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading}
                title={
                  isRecording
                    ? 'Stop recording and send query'
                    : currentLangObj.code === 'auto'
                    ? 'Speak in English, Hindi, or any Indian language (Sarvam Saaras STT)'
                    : `Speak in ${currentLangObj.name} (Sarvam Saaras STT)`
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

              {/* Text Input */}
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
                    ? 'Ask anything in English, Hindi, or your language...'
                    : `Ask in ${currentLangObj.name} or English...`
                }
                disabled={loading || isRecording}
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || loading || isRecording}
                className="p-2.5 bg-trust-600 text-white rounded-xl hover:bg-trust-700 transition disabled:opacity-40 shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
