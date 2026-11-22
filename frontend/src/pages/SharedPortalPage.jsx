import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { emergencyApi } from '../api/emergency';
import { useToast } from '../context/ToastContext';
import {
  ShieldAlert,
  Stethoscope,
  KeyRound,
  QrCode,
  Heart,
  Phone,
  AlertTriangle,
  FileText,
  Pill,
  Download,
  Lock,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Search
} from 'lucide-react';

export default function SharedPortalPage() {
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [tokenInput, setTokenInput] = useState(searchParams.get('token') || '');
  const [pinInput, setPinInput] = useState(searchParams.get('pin') || '');
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'medications' | 'contacts'

  // If token is passed in URL query, load automatically
  useEffect(() => {
    const initialToken = searchParams.get('token');
    if (initialToken) {
      loadProfile(initialToken);
    }
  }, [searchParams]);

  const loadProfile = async (tokenToUse) => {
    const token = tokenToUse || tokenInput;
    if (!token || !token.trim()) {
      toast.error('Token Required', 'Please enter a valid emergency QR token or doctor PIN.');
      return;
    }

    setLoading(true);
    try {
      const res = await emergencyApi.getByToken(token.trim());
      if (res.data) {
        setPatientData(res.data);
        toast.success('Clinical Access Granted', 'Patient verified and life-saving vitals decrypted.');
      }
    } catch (err) {
      toast.error('Access Denied', err.message || 'Invalid or expired emergency token.');
      setPatientData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    loadProfile(tokenInput);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* If no patient data is unlocked yet: PIN/Token entry card */}
        {!patientData ? (
          <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-trust-50 text-trust-600 flex items-center justify-center mx-auto border border-trust-100">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-navy-900">Doctor & Clinician Portal</h2>
              <p className="text-xs text-slate-500">
                Enter the emergency QR token or patient-shared authorization code
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Emergency Token or PIN
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="e.g. emg_sec_token_9981x or 6-digit PIN"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-trust-600 text-white font-bold text-sm hover:bg-trust-700 transition shadow-md shadow-trust-600/30 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Decrypt Clinical Vitals</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-400">
                Authorized for medical practitioners and first responders under HIPAA emergency access exceptions.
              </span>
            </div>
          </div>
        ) : (
          /* Clinical Review View */
          <div className="space-y-6 animate-in fade-in">
            
            {/* Top Patient Banner */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex flex-col items-center justify-center font-extrabold border border-rose-100">
                  <span className="text-xl leading-none">{patientData.patient?.bloodGroup || 'O+'}</span>
                  <span className="text-[10px] text-rose-500 uppercase mt-0.5">Blood</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-extrabold text-navy-900">{patientData.patient?.name || 'Verified Patient'}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      Emergency Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Age: {patientData.patient?.age || 'Adult'} • Organ Donor:{' '}
                    <span className="font-semibold text-slate-700">
                      {patientData.organDonor ? 'Yes (Registered)' : 'No'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPatientData(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Close Session
                </button>
              </div>
            </div>

            {/* Critical Allergy Warning Banner */}
            {patientData.patient?.allergies && patientData.patient.allergies.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-rose-900 uppercase tracking-wide block">
                    Severe Allergies Reported:
                  </span>
                  <p className="text-rose-800 font-semibold mt-0.5">
                    {patientData.patient.allergies.join(' • ')}
                  </p>
                </div>
              </div>
            )}

            {/* Clinical Overview Sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Critical Conditions */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>Critical Conditions</span>
                </h4>
                {patientData.criticalConditions && patientData.criticalConditions.length > 0 ? (
                  <ul className="space-y-1.5 text-xs">
                    {patientData.criticalConditions.map((cond, i) => (
                      <li key={i} className="p-2 bg-slate-50 rounded-lg font-semibold text-slate-800">
                        ⚡ {cond}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">No chronic emergency conditions recorded.</p>
                )}

                {patientData.notes && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Critical Notes</span>
                    <p className="text-xs text-slate-600 italic mt-0.5">"{patientData.notes}"</p>
                  </div>
                )}
              </div>

              {/* Primary Physician & Insurance */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-trust-600" />
                  <span>Primary Physician & Hospital</span>
                </h4>
                <div className="text-xs space-y-1 text-slate-700">
                  <div className="font-bold text-sm text-navy-900">
                    {patientData.primaryPhysician?.name || 'Not on file'}
                  </div>
                  <div>{patientData.primaryPhysician?.hospital || 'Local Hospital System'}</div>
                  {patientData.primaryPhysician?.phone && (
                    <a
                      href={`tel:${patientData.primaryPhysician.phone}`}
                      className="inline-flex items-center gap-1 text-trust-600 font-bold hover:underline pt-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{patientData.primaryPhysician.phone}</span>
                    </a>
                  )}
                </div>

                {patientData.insuranceInfo?.provider && (
                  <div className="pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Insurance Policy</span>
                    <div className="font-semibold text-slate-800">{patientData.insuranceInfo.provider}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{patientData.insuranceInfo.policyNumber}</div>
                  </div>
                )}
              </div>

              {/* Emergency Contacts */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>Emergency Contacts</span>
                </h4>
                {patientData.emergencyContacts && patientData.emergencyContacts.length > 0 ? (
                  <div className="space-y-2">
                    {patientData.emergencyContacts.map((c, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 rounded-xl text-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800">{c.name}</div>
                          <div className="text-[10px] text-slate-500">{c.relationship || 'Emergency Contact'}</div>
                        </div>
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-emerald-700 hover:bg-emerald-50 text-[11px]"
                          >
                            Call
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No emergency contacts provided.</p>
                )}
              </div>

            </div>

            {/* Active Medications Table */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-navy-900 flex items-center gap-2">
                    <Pill className="w-5 h-5 text-emerald-600" />
                    <span>Active Clinical Medications & Prescriptions</span>
                  </h3>
                  <p className="text-xs text-slate-500">Live active prescriptions synced from AyuRaksha</p>
                </div>
              </div>

              {patientData.activeMedications && patientData.activeMedications.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="pb-2">Medication</th>
                        <th className="pb-2">Dosage</th>
                        <th className="pb-2">Frequency</th>
                        <th className="pb-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patientData.activeMedications.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 font-bold text-navy-900">{m.name}</td>
                          <td className="py-3 text-trust-600 font-mono">{m.dosage}</td>
                          <td className="py-3 text-slate-600">{m.frequency}</td>
                          <td className="py-3 text-slate-500">{m.duration || 'Ongoing'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No active medications registered for this patient.</p>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
