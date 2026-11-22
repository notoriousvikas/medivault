import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  Pause,
  Play,
  RotateCcw,
  FileText,
  ChevronDown,
  X,
  ShieldCheck,
  Bot,
  User,
  Zap,
  Check,
  AlertCircle,
  Send,
  CornerDownLeft,
} from 'lucide-react';
import { chatApi } from '../../api/chat';
import { useToast } from '../../context/ToastContext';
import FormattedAiText from '../common/FormattedAiText';

// Centralized Indic & English languages supported by Sarvam Saaras & Bulbul
const LIVE_LANGUAGES = [
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'en-IN', name: 'English (India)', nativeName: 'English', flag: '🇮🇳' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'od-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { code: 'auto', name: 'Auto-Detect', nativeName: 'Auto', flag: '🌐' },
];

/**
 * LiveAudioChatOverlay:
 * Rock-solid, full-duplex interactive Live Voice Assistant for MediVault.
 * Provides resilient Web Speech API + Sarvam Saaras v4 fallback audio recording,
 * animated decibel visualizer, auto-VAD, tap-to-speak, and RAG Groq LLM integration.
 */
export default function LiveAudioChatOverlay({
  isOpen,
  onClose,
  referenceRecord = null,
  initialLanguage = 'hi-IN',
  onNewMessage,
  existingMessages = [],
}) {
  const toast = useToast();

  // Call status: 'connecting' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'error'
  const [callState, setCallState] = useState('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage || 'hi-IN');
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [manualText, setManualText] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [permissionError, setPermissionError] = useState(null);

  // Live subtitles & captions
  const [userInterimText, setUserInterimText] = useState('');
  const [userFinalText, setUserFinalText] = useState('');
  const [aiSpeechText, setAiSpeechText] = useState('');
  const [callHistory, setCallHistory] = useState(existingMessages || []);

  // Audio levels for animated visualizer (0.0 to 1.0)
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Mutable refs to prevent stale closure issues in SpeechRecognition callbacks
  const callStateRef = useRef('connecting');
  const isMutedRef = useRef(false);
  const selectedLanguageRef = useRef(selectedLanguage);
  const isProcessingTurnRef = useRef(false);
  const isMountedRef = useRef(true);

  // Audio elements & recording refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const activeAudioElementRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const callTimerRef = useRef(null);
  const canvasRef = useRef(null);

  // MediaRecorder audio capture fallback for browsers without SpeechRecognition
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Keep state refs in sync
  const updateCallState = (newState) => {
    callStateRef.current = newState;
    setCallState(newState);
  };

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  useEffect(() => {
    if (existingMessages?.length) {
      setCallHistory(existingMessages);
    }
  }, [existingMessages]);

  // Call duration timer
  useEffect(() => {
    if (!isOpen) return;
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isOpen]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ── Web Audio Analyser Visualizer ─────────────────────────────────────────
  const initAudioAnalyser = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current || !isMountedRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128);
        setVolumeLevel(normalized);

        drawCanvasVisualizer(dataArray);

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.warn('Audio analyser init warning:', err);
    }
  };

  const drawCanvasVisualizer = (dataArray) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const barCount = 24;
    const barWidth = Math.max(3, width / barCount - 3);

    for (let i = 0; i < barCount; i++) {
      const val = dataArray[i % dataArray.length] || 0;
      const barHeight = Math.max(4, (val / 255) * (height * 0.85));

      const gradient = ctx.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2);
      if (callStateRef.current === 'speaking') {
        gradient.addColorStop(0, '#818cf8');
        gradient.addColorStop(0.5, '#4f46e5');
        gradient.addColorStop(1, '#a855f7');
      } else if (callStateRef.current === 'thinking') {
        gradient.addColorStop(0, '#f59e0b');
        gradient.addColorStop(1, '#d97706');
      } else {
        gradient.addColorStop(0, '#34d399');
        gradient.addColorStop(0.5, '#059669');
        gradient.addColorStop(1, '#06b6d4');
      }

      ctx.fillStyle = gradient;
      const x = i * (barWidth + 3);
      const y = (height - barHeight) / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 4);
      ctx.fill();
    }
  };

  // ── Stop active speech synthesis or audio ─────────────────────────────────
  const interruptAiSpeech = useCallback(() => {
    if (activeAudioElementRef.current) {
      activeAudioElementRef.current.pause();
      activeAudioElementRef.current = null;
    }
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // ── Dispatch user query to backend live-turn engine ───────────────────────
  const submitUserQuery = async (queryText, audioBlob = null) => {
    if (isProcessingTurnRef.current) return;
    const textToSend = (queryText || '').trim();
    if (!textToSend && !audioBlob) {
      resumeListening();
      return;
    }

    isProcessingTurnRef.current = true;
    updateCallState('thinking');
    setUserInterimText('');
    setUserFinalText(textToSend);
    interruptAiSpeech();

    const tempUserId = 'u_' + Date.now();
    const userMsgObj = {
      _id: tempUserId,
      role: 'user',
      content: textToSend || '(Spoken voice input)',
      isVoice: true,
      createdAt: new Date().toISOString(),
    };

    setCallHistory((prev) => [...prev, userMsgObj]);
    if (onNewMessage) onNewMessage(userMsgObj);

    try {
      let turnResponse = null;

      if (audioBlob) {
        // Multipart audio chunk upload
        const formData = new FormData();
        const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
        formData.append('audio', audioBlob, `live_audio.${ext}`);
        formData.append('languageCode', selectedLanguageRef.current);
        if (referenceRecord?._id) {
          formData.append('referenceId', referenceRecord._id);
          formData.append('referenceType', 'Record');
        }
        turnResponse = await chatApi.liveTurn(formData, true);
      } else {
        // Pre-transcribed text turn (Sub-second speed)
        turnResponse = await chatApi.liveTurn({
          message: textToSend,
          languageCode: selectedLanguageRef.current !== 'auto' ? selectedLanguageRef.current : undefined,
          referenceId: referenceRecord?._id,
          referenceType: referenceRecord ? 'Record' : 'None',
        });
      }

      const resData = turnResponse?.data;
      if (!resData || !resData.reply) {
        throw new Error('No answer returned from Aarogya AI.');
      }

      const asstId = resData.messageId || 'a_' + Date.now();
      const asstMsgObj = {
        _id: asstId,
        role: 'assistant',
        content: resData.reply,
        isVoice: true,
        contextUsed: resData.contextUsed,
        createdAt: resData.createdAt || new Date().toISOString(),
        metadata: resData.metadata,
      };

      setCallHistory((prev) => [...prev, asstMsgObj]);
      if (onNewMessage) onNewMessage(asstMsgObj);

      setAiSpeechText(resData.reply);
      updateCallState('speaking');

      if (!isSpeakerMuted) {
        await playAiAudioResponse(resData.reply, resData.audio, resData.languageCode);
      } else {
        setTimeout(() => {
          resumeListening();
        }, 2500);
      }
    } catch (err) {
      console.error('Live turn error:', err);
      toast.error('Voice Assistant Notice', err.message || 'Could not process voice query.');
      resumeListening();
    } finally {
      isProcessingTurnRef.current = false;
    }
  };

  // Play AI response via Sarvam TTS audio or browser fallback
  const playAiAudioResponse = async (text, audioDataUrl, langCode) => {
    return new Promise((resolve) => {
      if (audioDataUrl) {
        try {
          const audio = new Audio(audioDataUrl);
          activeAudioElementRef.current = audio;

          audio.onended = () => {
            activeAudioElementRef.current = null;
            resumeListening();
            resolve();
          };

          audio.onerror = (e) => {
            console.warn('Audio tag playback error, falling back to speech synthesis:', e);
            playBrowserSpeechFallback(text, langCode, resolve);
          };

          audio.play().catch((playErr) => {
            console.warn('Autoplay error:', playErr);
            playBrowserSpeechFallback(text, langCode, resolve);
          });
          return;
        } catch (err) {
          console.warn('Audio tag init error:', err);
        }
      }

      playBrowserSpeechFallback(text, langCode, resolve);
    });
  };

  const playBrowserSpeechFallback = (text, langCode, onComplete) => {
    if (!('speechSynthesis' in window)) {
      resumeListening();
      if (onComplete) onComplete();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#`_\[\]]/g, '').slice(0, 300);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = langCode || (selectedLanguageRef.current !== 'auto' ? selectedLanguageRef.current : 'hi-IN');
      utterance.rate = 1.05;

      utterance.onend = () => {
        resumeListening();
        if (onComplete) onComplete();
      };
      utterance.onerror = () => {
        resumeListening();
        if (onComplete) onComplete();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      resumeListening();
      if (onComplete) onComplete();
    }
  };

  // Resume listening loop safely
  const resumeListening = () => {
    if (!isMountedRef.current) return;
    updateCallState('listening');
    setUserInterimText('');
    setAiSpeechText('');

    if (speechRecognitionRef.current && !isMutedRef.current) {
      try {
        speechRecognitionRef.current.start();
      } catch (err) {
        // Recognition may already be active
      }
    }
  };

  // ── Setup Speech Recognition & Microphone Stream ──────────────────────────
  const startLiveSession = async () => {
    setPermissionError(null);
    updateCallState('connecting');

    try {
      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      initAudioAnalyser(stream);

      // 2. Setup Web Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        speechRecognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.lang =
          selectedLanguageRef.current !== 'auto'
            ? selectedLanguageRef.current
            : 'hi-IN';

        recognition.onstart = () => {
          updateCallState('listening');
        };

        recognition.onresult = (event) => {
          if (callStateRef.current === 'speaking' || isProcessingTurnRef.current) {
            interruptAiSpeech();
            updateCallState('listening');
          }

          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }

          if (interim) {
            setUserInterimText(interim);
          }

          if (final) {
            setUserFinalText(final);
          }

          // Voice Activity Silence Detection: 1.3s pause triggers query submission
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

          silenceTimeoutRef.current = setTimeout(() => {
            const pendingQuery = final || interim;
            if (pendingQuery && pendingQuery.trim().length > 1) {
              try {
                recognition.stop();
              } catch (e) {}
              submitUserQuery(pendingQuery);
            }
          }, 1300);
        };

        recognition.onerror = (event) => {
          // 'no-speech' is a normal timeout event when no one spoke, do not break
          if (event.error === 'no-speech' || event.error === 'aborted') {
            return;
          }

          console.warn('Speech recognition event notice:', event.error);

          if (event.error === 'not-allowed') {
            setPermissionError('Microphone permission was denied. Please allow microphone access in your browser address bar.');
            updateCallState('paused');
          } else if (event.error === 'network' || event.error === 'service-not-allowed') {
            // Switch gracefully to MediaRecorder fallback
            console.info('Switching to MediaRecorder audio recording fallback');
            setupMediaRecorderFallback(stream);
          }
        };

        recognition.onend = () => {
          // Restart recognition using ref checks to avoid stale closure trap
          if (
            isMountedRef.current &&
            !isProcessingTurnRef.current &&
            callStateRef.current === 'listening' &&
            !isMutedRef.current
          ) {
            try {
              recognition.start();
            } catch (e) {}
          }
        };

        try {
          recognition.start();
        } catch (startErr) {
          console.warn('SpeechRecognition start notice:', startErr);
        }
      } else {
        // Browser does not support Web Speech API, use MediaRecorder fallback
        setupMediaRecorderFallback(stream);
      }

      updateCallState('listening');
    } catch (err) {
      console.error('Live audio setup error:', err);
      setPermissionError(err.message || 'Could not access microphone.');
      updateCallState('error');
    }
  };

  // Fallback recorder for browsers without SpeechRecognition
  const setupMediaRecorderFallback = (stream) => {
    let options = { mimeType: 'audio/webm' };
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }
    }

    try {
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: options.mimeType || 'audio/webm',
        });
        audioChunksRef.current = [];
        if (audioBlob.size > 1500) {
          submitUserQuery('', audioBlob);
        } else {
          resumeListening();
        }
      };

      recorder.start(500);
    } catch (e) {
      console.warn('MediaRecorder fallback init error:', e);
    }
  };

  // Manual Done Speaking button in case browser silence detection is delayed
  const handleDoneSpeaking = () => {
    const textToSend = userFinalText || userInterimText;
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      return;
    }

    if (textToSend && textToSend.trim()) {
      submitUserQuery(textToSend);
    } else {
      toast.info('Speak Query', 'Please speak into your mic or type below.');
    }
  };

  // Manual Text Submit inside Live Audio session
  const handleManualTextSubmit = (e) => {
    if (e) e.preventDefault();
    if (!manualText.trim()) return;
    const txt = manualText.trim();
    setManualText('');
    setShowTextInput(false);
    submitUserQuery(txt);
  };

  // ── Mute / Unmute Microphone ──────────────────────────────────────────────
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;

    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    if (nextMuted) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
      }
      updateCallState('paused');
    } else {
      resumeListening();
    }
  };

  // ── Language Change ───────────────────────────────────────────────────────
  const handleLanguageSelect = (langCode) => {
    setSelectedLanguage(langCode);
    selectedLanguageRef.current = langCode;
    setShowLanguagePicker(false);

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current.lang = langCode !== 'auto' ? langCode : 'hi-IN';
        if (!isMutedRef.current && callStateRef.current === 'listening') {
          setTimeout(() => {
            try {
              speechRecognitionRef.current.start();
            } catch (e) {}
          }, 200);
        }
      } catch (e) {}
    }

    const langObj = LIVE_LANGUAGES.find((l) => l.code === langCode);
    toast.info('Language Switched', `Now conversing in ${langObj?.name || langCode}`);
  };

  // ── Stop streams without triggering onClose ───────────────────────────────
  const stopAllAudioAndStreams = () => {
    interruptAiSpeech();

    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (callTimerRef.current) clearInterval(callTimerRef.current);

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
  };

  // ── User-initiated Hangup ─────────────────────────────────────────────────
  const handleUserHangup = () => {
    stopAllAudioAndStreams();
    toast.info('Live Audio Call Ended', `Session duration: ${formatTime(callDuration)}`);
    onClose();
  };

  // Lifecycle: start on open, stop tracks on unmount
  useEffect(() => {
    if (isOpen) {
      isMountedRef.current = true;
      startLiveSession();
    }
    return () => {
      isMountedRef.current = false;
      stopAllAudioAndStreams();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentLangObj =
    LIVE_LANGUAGES.find((l) => l.code === selectedLanguage) || LIVE_LANGUAGES[0];

  let statusBadge = {
    text: 'Aarogya Live Connected',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    indicator: 'bg-emerald-400 animate-pulse',
  };
  if (callState === 'connecting') {
    statusBadge = {
      text: 'Initializing Audio Channel...',
      color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      indicator: 'bg-indigo-400 animate-spin',
    };
  } else if (callState === 'thinking') {
    statusBadge = {
      text: 'Analyzing Clinical Records & RAG Context...',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      indicator: 'bg-amber-400 animate-ping',
    };
  } else if (callState === 'speaking') {
    statusBadge = {
      text: 'Aarogya AI Speaking (Sarvam Indic Voice)...',
      color: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
      indicator: 'bg-violet-400 animate-pulse',
    };
  } else if (callState === 'paused' || isMuted) {
    statusBadge = {
      text: 'Microphone Muted',
      color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      indicator: 'bg-rose-400',
    };
  } else if (callState === 'error') {
    statusBadge = {
      text: 'Audio Permission Needed',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      indicator: 'bg-amber-400',
    };
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-300">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-trust-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Container */}
      <div className="relative w-full max-w-2xl h-[92vh] max-h-[750px] bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white tracking-wide">
                  Aarogya Live Voice Call
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-trust-500/20 text-trust-300 text-[10px] font-mono font-bold border border-trust-400/30">
                  REAL-TIME AI
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-mono text-emerald-400 font-bold">{formatTime(callDuration)}</span>
                <span>&bull;</span>
                <span className="text-[11px] text-slate-400">Grounded in Medical Vault</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Transcript Drawer Toggle */}
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                showTranscript
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Toggle Live Transcript"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Transcript</span>
            </button>

            {/* Language Selector Button */}
            <div className="relative">
              <button
                onClick={() => setShowLanguagePicker(!showLanguagePicker)}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
              >
                <span>{currentLangObj.flag}</span>
                <span className="hidden sm:inline">{currentLangObj.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showLanguagePicker && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-30 max-h-64 overflow-y-auto">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    Select Spoken Language:
                  </div>
                  {LIVE_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageSelect(lang.code)}
                      className={`w-full px-3 py-2 text-left text-xs font-medium rounded-xl flex items-center justify-between transition ${
                        selectedLanguage === lang.code
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        <span className="text-[10px] text-slate-400">({lang.nativeName})</span>
                      </div>
                      {selectedLanguage === lang.code && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* End Call Button */}
            <button
              onClick={handleUserHangup}
              className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 transition"
              title="End Live Call"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Focused Record Banner if provided */}
        {referenceRecord && (
          <div className="px-5 py-2 bg-indigo-950/60 border-b border-indigo-900/40 flex items-center justify-between text-xs text-indigo-200 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                <strong>Focused Clinical Record:</strong> {referenceRecord.title}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-[10px] font-bold text-indigo-200 border border-indigo-400/40 uppercase">
              RAG Prioritized
            </span>
          </div>
        )}

        {/* Permission Notice Banner if microphone was blocked */}
        {permissionError && (
          <div className="px-5 py-2.5 bg-amber-500/20 border-b border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{permissionError}</span>
            </div>
            <button
              onClick={startLiveSession}
              className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition shrink-0"
            >
              Retry Mic
            </button>
          </div>
        )}

        {/* Status Chip */}
        <div className="px-5 pt-3 flex items-center justify-center shrink-0">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold border transition ${statusBadge.color}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusBadge.indicator}`} />
            <span>{statusBadge.text}</span>
          </div>
        </div>

        {/* Center Interactive Visualizer Workspace */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-6 min-h-0 overflow-hidden">
          {showTranscript ? (
            /* Transcript Drawer View */
            <div className="w-full h-full overflow-y-auto space-y-3 p-2 text-xs">
              <div className="text-center pb-2 text-[11px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                Live Conversation Log
              </div>
              {callHistory.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-500 text-center">
                  Start speaking to begin your live medical dialogue with Aarogya AI.
                </div>
              ) : (
                callHistory.map((m) => {
                  const isAsst = m.role === 'assistant';
                  return (
                    <div
                      key={m._id}
                      className={`flex items-start gap-2.5 ${isAsst ? 'justify-start' : 'justify-end'}`}
                    >
                      {isAsst && (
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          isAsst
                            ? 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/60'
                            : 'bg-trust-600 text-white rounded-tr-sm'
                        }`}
                      >
                        {isAsst ? <FormattedAiText text={m.content} /> : <div>{m.content}</div>}
                      </div>
                      {!isAsst && (
                        <div className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Visualizer Voice Orb View */
            <div className="w-full flex flex-col items-center justify-center text-center space-y-6">
              {/* Animated Central Voice Orb */}
              <div className="relative flex items-center justify-center">
                {/* Ripple Ring 1 */}
                <div
                  className={`absolute rounded-full transition-all duration-300 ${
                    callState === 'speaking'
                      ? 'w-48 h-48 bg-indigo-500/20 animate-ping'
                      : callState === 'listening'
                      ? 'w-44 h-44 bg-emerald-500/15 animate-pulse'
                      : 'w-40 h-40 bg-slate-800/40'
                  }`}
                  style={{
                    transform: `scale(${1 + volumeLevel * 0.6})`,
                  }}
                />

                {/* Ripple Ring 2 */}
                <div
                  className={`absolute rounded-full border transition-all duration-200 ${
                    callState === 'speaking'
                      ? 'w-36 h-36 border-indigo-400/40'
                      : callState === 'listening'
                      ? 'w-36 h-36 border-emerald-400/30'
                      : 'w-32 h-32 border-slate-700/40'
                  }`}
                  style={{
                    transform: `scale(${1 + volumeLevel * 0.35})`,
                  }}
                />

                {/* Core Glowing Sphere */}
                <div
                  className={`relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 ${
                    callState === 'speaking'
                      ? 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-indigo-500/50 scale-105'
                      : callState === 'thinking'
                      ? 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white shadow-amber-500/50 animate-spin'
                      : callState === 'listening'
                      ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-trust-600 text-white shadow-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 shadow-none'
                  }`}
                  style={{
                    boxShadow:
                      callState === 'listening' || callState === 'speaking'
                        ? `0 0 ${20 + volumeLevel * 40}px ${
                            callState === 'speaking' ? '#6366f1' : '#10b981'
                          }`
                        : undefined,
                  }}
                >
                  {callState === 'speaking' ? (
                    <Volume2 className="w-10 h-10 animate-bounce" />
                  ) : callState === 'thinking' ? (
                    <RotateCcw className="w-10 h-10 animate-spin" />
                  ) : callState === 'listening' ? (
                    <Mic className="w-10 h-10" />
                  ) : (
                    <MicOff className="w-10 h-10 text-rose-400" />
                  )}
                </div>
              </div>

              {/* Real-time Frequency Waveform Canvas */}
              <div className="w-full max-w-xs h-14 flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={240}
                  height={56}
                  className="rounded-xl opacity-90"
                />
              </div>

              {/* Live Subtitles & Captions Box */}
              <div className="w-full max-w-lg px-4 py-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center min-h-[72px] flex flex-col justify-center shadow-inner">
                {callState === 'listening' ? (
                  userInterimText ? (
                    <p className="text-sm font-medium text-emerald-300 italic animate-pulse">
                      &ldquo;{userInterimText}&rdquo;
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Listening in{' '}
                      <strong className="text-slate-200">
                        {currentLangObj.name} ({currentLangObj.nativeName})
                      </strong>
                      ... Speak naturally.
                    </p>
                  )
                ) : callState === 'thinking' ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-amber-300 flex items-center justify-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 animate-bounce" />
                      <span>Processing clinical response with Groq RAG...</span>
                    </p>
                    {userFinalText && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        &ldquo;{userFinalText}&rdquo;
                      </p>
                    )}
                  </div>
                ) : callState === 'speaking' ? (
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-indigo-200 line-clamp-3">
                      &ldquo;{aiSpeechText}&rdquo;
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Call paused. Tap the microphone button below to resume.
                  </p>
                )}
              </div>

              {/* Action Buttons below Orb */}
              <div className="flex items-center gap-2">
                {callState === 'listening' && (
                  <button
                    onClick={handleDoneSpeaking}
                    className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition hover:scale-105 active:scale-95 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Done Speaking &bull; Send Query</span>
                  </button>
                )}

                <button
                  onClick={() => setShowTextInput(!showTextInput)}
                  className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  {showTextInput ? 'Hide Text Box' : 'Type Instead'}
                </button>
              </div>

              {/* Optional Text Input for noisy environments or mic failures */}
              {showTextInput && (
                <form
                  onSubmit={handleManualTextSubmit}
                  className="w-full max-w-md flex items-center gap-2 bg-slate-950/80 p-2 rounded-2xl border border-slate-800"
                >
                  <input
                    type="text"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Type your medical question here..."
                    className="flex-1 px-3 py-1.5 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!manualText.trim()}
                    className="p-2 rounded-xl bg-trust-600 hover:bg-trust-500 text-white disabled:opacity-40 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Bottom Call Controls Dock */}
        <div className="px-6 py-4 bg-slate-950/70 border-t border-slate-800/80 flex items-center justify-around shrink-0">
          {/* Mute/Unmute Mic Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className={`p-3.5 rounded-2xl flex flex-col items-center gap-1 transition ${
              isMuted
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-[10px] font-bold">{isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* Interrupt / Push to Speak (When AI is speaking) */}
          {callState === 'speaking' ? (
            <button
              type="button"
              onClick={interruptAiSpeech}
              className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/30 animate-pulse transition"
              title="Interrupt AI and speak"
            >
              <Pause className="w-4 h-4 fill-slate-950" />
              <span>Tap to Interrupt</span>
            </button>
          ) : (
            /* Hands-Free indicator */
            <div className="flex flex-col items-center text-center">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                Continuous Voice AI
              </span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Auto-Detects Speech</span>
              </span>
            </div>
          )}

          {/* Speaker Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextSpeaker = !isSpeakerMuted;
              setIsSpeakerMuted(nextSpeaker);
              if (!nextSpeaker) interruptAiSpeech();
            }}
            className={`p-3.5 rounded-2xl flex flex-col items-center gap-1 transition ${
              isSpeakerMuted
                ? 'bg-slate-800 text-slate-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title={isSpeakerMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
          >
            {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            <span className="text-[10px] font-bold">{isSpeakerMuted ? 'Speaker Off' : 'Speaker On'}</span>
          </button>

          {/* Red Hangup Button */}
          <button
            type="button"
            onClick={handleUserHangup}
            className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 flex flex-col items-center gap-1 transition hover:scale-105 active:scale-95"
            title="End Live Audio Call"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-[10px] font-bold">End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}
