import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { emergencyApi } from '../api/emergency';
import { ShieldAlert, Heart, Phone, AlertTriangle, Pill, RefreshCw, ArrowLeft } from 'lucide-react';

export default function EmergencyPublicPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmergencyData = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await emergencyApi.getByToken(token);
        if (res.data) {
          setData(res.data);
        }
      } catch (err: any) {
        setError(err.message || 'Emergency medical card is inactive or not found.');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchEmergencyData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 text-rose-600 animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Decrypting Emergency Vitals...</h2>
          <p className="text-xs text-slate-500">First responder life-line active</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-navy-900">Emergency Card Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'This emergency token has expired or access was revoked by the patient.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-trust-600 text-white text-xs font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to AyuRaksha</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto w-full space-y-6">

        <div className="bg-rose-600 text-white p-4 sm:p-6 rounded-3xl shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-white" />
            <div>
              <span className="text-[10px] font-extrabold tracking-widest uppercase bg-rose-700/80 px-2 py-0.5 rounded">
                PRANASETU CRITICAL TRIAGE PASS
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                {data.patient?.name || 'Verified Patient'}
              </h1>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl sm:text-4xl font-black">{data.patient?.bloodGroup || 'O+'}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider block text-rose-200">
              Blood Type
            </span>
          </div>
        </div>

        {data.patient?.allergies && data.patient.allergies.length > 0 && (
          <div className="p-4 bg-amber-500/10 border-2 border-amber-500 rounded-2xl space-y-1">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>SEVERE ALLERGIES & CONTRAINDICATIONS</span>
            </div>
            <p className="text-lg font-extrabold text-amber-300">
              {data.patient.allergies.join(' • ')}
            </p>
          </div>
        )}

        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400" />
            <span>Critical Medical Conditions</span>
          </h2>

          <div className="flex flex-wrap gap-2">
            {data.criticalConditions && data.criticalConditions.length > 0 ? (
              data.criticalConditions.map((cond: string, i: number) => (
                <span
                  key={i}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-700 font-bold text-sm text-white border border-slate-600"
                >
                  ⚡ {cond}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-400">None registered</span>
            )}
          </div>

          {data.notes && (
            <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-700 text-sm text-slate-200 italic">
              "{data.notes}"
            </div>
          )}
        </div>

        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>Emergency Contacts (Tap to Call)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.emergencyContacts && data.emergencyContacts.length > 0 ? (
              data.emergencyContacts.map((c: any, i: number) => (
                <div
                  key={i}
                  className="p-3.5 bg-slate-900 rounded-2xl border border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-white text-sm">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.relationship || 'Contact'}</div>
                  </div>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{c.phone}</span>
                    </a>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No emergency contacts listed.</p>
            )}
          </div>
        </div>

        {data.activeMedications && data.activeMedications.length > 0 && (
          <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Pill className="w-4 h-4 text-trust-400" />
              <span>Current Medications</span>
            </h2>
            <div className="space-y-2">
              {data.activeMedications.map((m: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-900 rounded-xl text-xs flex items-center justify-between text-slate-200"
                >
                  <span className="font-bold text-sm text-white">{m.name}</span>
                  <span className="font-mono text-trust-300">{m.dosage} ({m.frequency})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.primaryPhysician?.name && (
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase block text-[10px]">Primary Physician</span>
              <span className="text-white font-bold">{data.primaryPhysician.name}</span>
              <span className="text-slate-400 block">{data.primaryPhysician.hospital}</span>
            </div>
            {data.primaryPhysician.phone && (
              <a
                href={`tel:${data.primaryPhysician.phone}`}
                className="px-3 py-1.5 bg-trust-600 hover:bg-trust-500 text-white font-bold rounded-xl"
              >
                Call Doctor
              </a>
            )}
          </div>
        )}

      </div>

      <div className="max-w-3xl mx-auto w-full pt-8 text-center text-xs text-slate-500">
        PranaSetu (Life Saver) Emergency Access Protocol • Cryptographically Logged
      </div>
    </div>
  );
}
