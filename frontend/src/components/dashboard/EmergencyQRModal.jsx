import React, { useState, useEffect } from 'react';
import { X, QrCode, ShieldAlert, Heart, Phone, AlertTriangle, RefreshCw, Printer, ExternalLink, Activity } from 'lucide-react';
import { emergencyApi } from '../../api/emergency';
import { useToast } from '../../context/ToastContext';

export default function EmergencyQRModal({ isOpen, onClose, user, onUserUpdate }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [emergencyToken, setEmergencyToken] = useState('');
  const [emergencyUrl, setEmergencyUrl] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [accessLogs, setAccessLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchQR = async () => {
      setLoading(true);
      try {
        const res = await emergencyApi.getQRCode();
        if (res.data) {
          setQrDataUrl(res.data.qrCodeDataUrl);
          setEmergencyToken(res.data.emergencyToken);
          setEmergencyUrl(res.data.emergencyUrl);
        }

        // Also fetch access logs
        const logsRes = await emergencyApi.getAccessLogs();
        if (logsRes.data?.logs) {
          setAccessLogs(logsRes.data.logs);
        }
      } catch (err) {
        console.warn('Could not load emergency QR:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQR();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRegenerateToken = async () => {
    if (!window.confirm('Regenerating will revoke and invalidate previous QR codes printed or shared. Proceed?')) {
      return;
    }
    setRegenerating(true);
    try {
      const res = await emergencyApi.regenerateToken();
      if (res.data) {
        setQrDataUrl(res.data.qrCodeDataUrl);
        setEmergencyToken(res.data.emergencyToken);
        setEmergencyUrl(res.data.emergencyUrl);
        toast.success('Token Regenerated', 'A fresh cryptographic emergency QR pass has been generated.');
        if (onUserUpdate) onUserUpdate({ emergencyToken: res.data.emergencyToken });
      }
    } catch (err) {
      toast.error('Regeneration Failed', err.message || 'Could not update emergency token.');
    } finally {
      setRegenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const bloodGroup = user?.bloodGroup || 'O+';
  const allergies = user?.allergies || ['Penicillin'];
  const criticalConditions = user?.emergencyInfo?.criticalConditions || ['Type 1 Diabetes'];
  const notes = user?.emergencyInfo?.notes || 'Carries emergency insulin & glucagon kit.';
  const physician = user?.emergencyInfo?.primaryPhysician || {
    name: 'Dr. Robert Vance, MD',
    phone: '+1 (555) 876-5432',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-navy-900">Emergency Medical Pass</h3>
              <p className="text-xs text-slate-500">First-responder access token for life-critical triage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-5 space-y-5">
          
          {/* QR Code Presentation Box */}
          <div className="bg-gradient-to-b from-slate-50 to-slate-100/60 p-6 rounded-2xl border border-slate-200 text-center flex flex-col items-center">
            {loading ? (
              <div className="w-48 h-48 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-trust-600" />
              </div>
            ) : qrDataUrl ? (
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200/80 inline-block">
                <img
                  src={qrDataUrl}
                  alt="Emergency Medical QR Code"
                  className="w-44 h-44 object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="w-44 h-44 bg-white rounded-2xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs p-4">
                QR Code could not be loaded
              </div>
            )}

            <div className="mt-3">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                TOKEN: {emergencyToken ? emergencyToken.substring(0, 16) + '...' : 'SECURE'}
              </span>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Scan with any smartphone camera or first responder terminal
              </p>
            </div>
          </div>

          {/* Critical Triage Summary */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Critical Vitals Summary</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                  Blood Group
                </span>
                <span className="text-xl font-extrabold text-rose-900">{bloodGroup}</span>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
                  Organ Donor
                </span>
                <span className="text-sm font-bold text-amber-900">
                  {user?.emergencyInfo?.organDonor ? 'Registered Donor' : 'Not Specified'}
                </span>
              </div>
            </div>

            {/* Allergies & Conditions */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div>
                <span className="font-bold text-slate-700">Allergies: </span>
                {allergies && allergies.length > 0 ? (
                  <span className="text-rose-600 font-semibold">{allergies.join(', ')}</span>
                ) : (
                  <span className="text-slate-500">None reported</span>
                )}
              </div>

              <div>
                <span className="font-bold text-slate-700">Conditions: </span>
                <span className="text-slate-700">{criticalConditions.join(', ') || 'None'}</span>
              </div>

              {notes && (
                <div className="pt-1 border-t border-slate-200/60 text-slate-600 italic">
                  "{notes}"
                </div>
              )}
            </div>

            {/* Primary Physician */}
            {physician?.name && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <div className="font-bold text-slate-800">{physician.name}</div>
                  <div className="text-slate-500">Primary Care Physician</div>
                </div>
                {physician.phone && (
                  <a
                    href={`tel:${physician.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-trust-600 hover:bg-slate-50"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons: Regenerate, Print, Preview */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleRegenerateToken}
              disabled={regenerating}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              <span>Regenerate Token</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Card</span>
              </button>

              {emergencyToken && (
                <a
                  href={`/emergency/${emergencyToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-trust-600 text-white text-xs font-bold hover:bg-trust-700 transition"
                >
                  <span>Public View</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
