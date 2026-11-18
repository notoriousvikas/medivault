import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ title, message, type = 'info', duration = 4500 }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, title, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (title, message) => addToast({ title, message, type: 'success' }),
    error: (title, message) => addToast({ title, message, type: 'error' }),
    info: (title, message) => addToast({ title, message, type: 'info' }),
    warning: (title, message) => addToast({ title, message, type: 'warning' }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const typeStyles = {
            success: {
              border: 'border-emerald-200 bg-white/95 text-emerald-900',
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
              accent: 'bg-emerald-500',
            },
            error: {
              border: 'border-rose-200 bg-white/95 text-rose-900',
              icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
              accent: 'bg-rose-500',
            },
            warning: {
              border: 'border-amber-200 bg-white/95 text-amber-900',
              icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
              accent: 'bg-amber-500',
            },
            info: {
              border: 'border-blue-200 bg-white/95 text-blue-900',
              icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
              accent: 'bg-blue-500',
            },
          }[t.type];

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${typeStyles.border}`}
            >
              {typeStyles.icon}
              <div className="flex-1 text-sm">
                {t.title && <h4 className="font-semibold text-slate-900">{t.title}</h4>}
                {t.message && <p className="text-slate-600 mt-0.5 leading-relaxed">{t.message}</p>}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                aria-label="Close toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
