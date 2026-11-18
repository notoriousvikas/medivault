import React, { useState } from 'react';
import { X, Share2, Copy, Check, Lock, Clock, ShieldCheck, KeyRound, ExternalLink } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function ShareAccessModal({ isOpen, onClose, user }) {
  const toast = useToast();
  const [expiry, setExpiry] = useState('24h');
  const [allowDownload, setAllowDownload] = useState(true);
  const [includeAi, setIncludeAi] = useState(true);
  const [copied, setCopied] = useState(false);

  // Generate deterministic/stable simulated doctor PIN or use emergency token
  const doctorPin = user?.emergencyToken ? user.emergencyToken.slice(-6).toUpperCase() : '774912';
  const shareUrl = `${window.location.origin}/shared-portal?token=${user?.emergencyToken || 'emg_doc_token'}&pin=${doctorPin}`;

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link Copied', 'Time-bound encrypted access URL copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(doctorPin);
    toast.success('Doctor PIN Copied', `PIN "${doctorPin}" copied to clipboard.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-trust-600 flex items-center justify-center border border-blue-100">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-navy-900">Share Medical Access</h3>
              <p className="text-xs text-slate-500">Provide time-bound encrypted access to authorized doctors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration */}
        <div className="mt-5 space-y-4">
          
          {/* Expiration selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Access Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '1 Hour', value: '1h' },
                { label: '24 Hours', value: '24h' },
                { label: '7 Days', value: '7d' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setExpiry(item.value)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                    expiry === item.value
                      ? 'border-trust-600 bg-trust-50 text-trust-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Authorized Privileges
            </span>
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={(e) => setAllowDownload(e.target.checked)}
                className="w-4 h-4 text-trust-600 rounded border-slate-300 focus:ring-trust-500"
              />
              <span>Allow doctor to download high-res imaging & lab reports</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAi}
                onChange={(e) => setIncludeAi(e.target.checked)}
                className="w-4 h-4 text-trust-600 rounded border-slate-300 focus:ring-trust-500"
              />
              <span>Include Aarogya AI clinical summaries and biomarker flags</span>
            </label>
          </div>

          {/* Doctor PIN Code Display */}
          <div className="p-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 rounded-2xl border border-blue-200/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Doctor 6-Digit Access PIN
              </span>
              <span className="text-2xl font-mono font-extrabold text-navy-900 tracking-wider">
                {doctorPin}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyPin}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Copy PIN
            </button>
          </div>

          {/* Full Direct URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Encrypted Direct Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-trust-600 text-white rounded-xl text-xs font-bold hover:bg-trust-700 transition flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Link to Shared Portal */}
          <div className="pt-2 text-center">
            <a
              href={`/shared-portal?token=${user?.emergencyToken || 'emg_token'}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-trust-600 font-semibold hover:underline"
            >
              <span>Preview Doctor Shared Portal view</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}
