import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Send, Bot, User, Trash2, ShieldCheck, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { chatApi } from '../../api/chat';
import { useToast } from '../../context/ToastContext';

export default function AiChatAssistantDrawer({ isOpen, onClose, referenceRecord = null }) {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (messageText) => {
    const textToSend = messageText || input;
    if (!textToSend || !textToSend.trim() || loading) return;

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
      });

      if (res.data?.assistantMessage) {
        setMessages((prev) => [...prev, res.data.assistantMessage]);
      } else {
        // Refresh history to get latest stored messages
        const updated = await chatApi.getHistory();
        if (updated.data) setMessages(updated.data);
      }
    } catch (err) {
      toast.error('AI Error', err.message || 'Aarogya medical assistant could not generate a response.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all conversation history?')) return;
    try {
      await chatApi.clearHistory();
      setMessages([]);
      toast.info('Chat Cleared', 'Conversational memory reset.');
    } catch (err) {
      toast.error('Clear Failed', err.message || 'Could not reset chat history.');
    }
  };

  if (!isOpen) return null;

  const quickPrompts = [
    "Summarize my latest lab results in plain language",
    "Are my current medications safe together?",
    "Explain what elevated biomarkers mean",
    "What questions should I ask my doctor?"
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-navy-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-navy-900 to-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-400/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Aarogya AI Copilot</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Aarogya Clinical AI • Medical Intelligence</span>
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
              <span className="font-semibold truncate">
                Focused: {referenceRecord.title}
              </span>
              <span className="text-[10px] uppercase font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-200">
                Target Record
              </span>
            </div>
          )}

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {initialLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-trust-600" />
                <span>Loading conversational memory...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center text-center p-4 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-navy-900">Aarogya AI Medical Assistant</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Ask questions about your health records, lab reports, or medication interactions. Powered by Aarogya Clinical Intelligence.
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
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                        isAssistant
                          ? 'bg-slate-100 text-slate-800 rounded-tl-sm'
                          : 'bg-trust-600 text-white rounded-tr-sm shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      {isAssistant && m.contextUsed && (
                        <div className="mt-2 pt-1.5 border-t border-slate-200 text-[10px] text-slate-500 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Grounded in patient records & history</span>
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

            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 bg-slate-100 rounded-2xl rounded-tl-sm text-xs text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-trust-600" />
                  <span>Aarogya AI analyzing health context...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about lab results, medications, or vitals..."
                disabled={loading}
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-trust-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 bg-trust-600 text-white rounded-xl hover:bg-trust-700 transition disabled:opacity-40"
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
