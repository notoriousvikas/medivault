import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  Stethoscope,
  RefreshCw,
  Download,
} from 'lucide-react';
import { consultationsApi } from '../../api/consultations';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { User } from '../../types';

interface PatientConsultationQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PatientConsultationQRModal({
  isOpen,
  onClose,
}: PatientConsultationQRModalProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientCode, setPatientCode] = useState('');
  const [patientInfo, setPatientInfo] = useState<User | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    const loadQR = async () => {
      try {
        const res = await consultationsApi.getPatientQR();
        if (isMounted && res.data) {
          setQrDataUrl(res.data.qrCodeDataUrl || '');
          setPatientId(res.data.patientId || user?._id || '');
          setPatientCode(res.data.patientCode || (user?._id ? user._id.slice(-8).toUpperCase() : 'PATIENT'));
          setPatientInfo(res.data.patient || user);
        }
      } catch (err) {
        console.warn('Could not fetch patient registration QR code:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadQR();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    const textToCopy = patientId || patientCode;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Code Copied', 'Patient registration ID copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${patientInfo?.name || user?.name || 'patient'}-registration-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Downloaded', 'Registration QR image saved to your device.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative my-8 overflow-hidden text-center">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-trust-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-trust-600/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-navy-900">Patient Registration QR</h3>
              <p className="text-[11px] text-slate-500">Scan to register patient under doctor's care</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-left">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-trust-700 bg-trust-100/70 px-2 py-0.5 rounded">
                Patient Profile
              </span>
              <h4 className="text-sm font-black text-navy-900 mt-1">{patientInfo?.name || user?.name || 'Patient'}</h4>
              <p className="text-[11px] text-slate-500">
                Blood Group: <strong className="text-slate-700">{patientInfo?.bloodGroup || user?.bloodGroup || 'O+'}</strong> • Age: {patientInfo?.age || user?.age || 'Adult'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-trust-50 text-trust-600 flex items-center justify-center border border-trust-200/70">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-gradient-to-b from-slate-50 to-slate-100/70 p-5 rounded-2xl border border-slate-200 flex flex-col items-center">
            {loading ? (
              <div className="w-48 h-48 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-trust-600" />
              </div>
            ) : qrDataUrl ? (
              <div className="p-3.5 bg-white rounded-2xl shadow-md border border-slate-200/80 inline-block">
                <img
                  src={qrDataUrl}
                  alt="Patient Registration QR Code"
                  className="w-44 h-44 object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="w-44 h-44 bg-white rounded-2xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs p-4">
                QR Code could not be loaded
              </div>
            )}

            <div className="mt-3 flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ready for Doctor Scan</span>
            </div>

            <p className="text-xs text-slate-600 font-medium mt-2 max-w-xs">
              Present this QR to your doctor. The doctor will scan it with their camera scanner to register you under their consultation roster.
            </p>
          </div>

          {(patientCode || patientId) && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-left">
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  Patient Registration ID
                </span>
                <span className="text-xs font-mono font-bold text-navy-900 truncate block">
                  {patientId || patientCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {qrDataUrl && (
              <button
                type="button"
                onClick={handleDownloadQR}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save QR Image</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 rounded-xl bg-trust-600 hover:bg-trust-700 text-white text-xs font-bold transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
