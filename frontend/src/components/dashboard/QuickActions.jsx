import React from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, Share2, QrCode, Sparkles, Stethoscope, MessageSquare } from 'lucide-react';

export default function QuickActions({
  onOpenUpload,
  onOpenShare,
  onOpenEmergency,
  onOpenAiAssistant,
  onOpenPatientQR,
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-navy-900">Quick Actions</h3>
          <p className="text-xs text-slate-500">Manage, share, and protect your medical documents</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Upload Medical Record */}
          <button
            type="button"
            onClick={onOpenUpload}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-trust-600 text-white font-bold text-xs sm:text-sm hover:bg-trust-700 active:scale-95 transition shadow-sm shadow-trust-600/30"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Record</span>
          </button>

          {/* Doctor Chat / Consultations */}
          <Link
            to="/consultations"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs sm:text-sm hover:bg-teal-100 active:scale-95 transition shadow-sm"
          >
            <Stethoscope className="w-4 h-4 text-teal-600" />
            <span>Doctor Chat</span>
          </Link>

          {/* PranaSetu */}
          <button
            type="button"
            onClick={onOpenEmergency}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs sm:text-sm hover:bg-emerald-100 active:scale-95 transition shadow-sm"
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>PranaSetu</span>
          </button>

          {/* Doctor Registration QR */}
          {onOpenPatientQR && (
            <button
              type="button"
              onClick={onOpenPatientQR}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-trust-800 font-bold text-xs sm:text-sm hover:bg-blue-100 active:scale-95 transition shadow-sm"
              title="Show your QR code for doctor to scan"
            >
              <QrCode className="w-4 h-4 text-trust-600" />
              <span>Doctor QR</span>
            </button>
          )}

          {/* AI Health Assistant */}
          <button
            type="button"
            onClick={onOpenAiAssistant}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-xs sm:text-sm hover:bg-indigo-100 active:scale-95 transition shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Aarogya AI</span>
          </button>

          {/* Share Access */}
          <button
            type="button"
            onClick={onOpenShare}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 active:scale-95 transition shadow-sm"
          >
            <Share2 className="w-4 h-4 text-slate-500" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}
