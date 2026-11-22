import React, { useState } from 'react';
import {
  X,
  Activity,
  Plus,
  ShieldCheck,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Send,
  Sparkles,
} from 'lucide-react';
import { healthRiskApi } from '../../api/healthRisk';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const SUGGESTED_SYMPTOMS = [
  'Fever',
  'High Temperature',
  'Dry Cough',
  'Wet Cough',
  'Sore Throat',
  'Headache',
  'Body Ache',
  'Extreme Fatigue',
  'Nausea / Vomiting',
  'Diarrhea',
  'Skin Rash',
  'Chills & Sweats',
  'Shortness of Breath',
];

export default function QuickSymptomReportModal({ isOpen, onClose, onReportSubmitted }) {
  const { user } = useAuth();
  const toast = useToast();

  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [notes, setNotes] = useState('');
  const [locality, setLocality] = useState(
    user?.location?.address || user?.location?.city || ''
  );
  const [city, setCity] = useState(user?.location?.city || '');
  const [postalCode, setPostalCode] = useState(user?.location?.postalCode || '');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleSymptom = (sym) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleAddCustom = (e) => {
    e?.preventDefault();
    if (customInput.trim() && !selectedSymptoms.includes(customInput.trim())) {
      setSelectedSymptoms((prev) => [...prev, customInput.trim()]);
      setCustomInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedSymptoms.length === 0) {
      toast.error('Symptoms Required', 'Please select or add at least one symptom.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        rawSymptoms: selectedSymptoms,
        severity,
        notes: notes.trim(),
        area: {
          locality: locality.trim() || undefined,
          city: city.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          latitude: user?.location?.latitude,
          longitude: user?.location?.longitude,
        },
      };

      const res = await healthRiskApi.submitReport(payload);
      toast.success(
        'Symptom Report Recorded',
        'Thank you! Your report helps MediVault monitor neighborhood health clusters.'
      );

      if (onReportSubmitted) {
        onReportSubmitted(res.data);
      }
      onClose();
    } catch (err) {
      toast.error('Submission Failed', err.message || 'Could not record report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-navy-900">
                Report Health Symptoms
              </h3>
              <p className="text-xs text-slate-500">
                Confidential community health cluster detection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-navy-900 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Privacy Notice Banner */}
          <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="text-xs text-sky-900 leading-relaxed">
              <span className="font-bold">Strictly Anonymous & Aggregated:</span> Your personal identity and medical records are never exposed. Symptom patterns are grouped at the locality level to help identify potential health spikes.
            </div>
          </div>

          {/* Quick Symptoms Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center justify-between">
              <span>Select Current Symptoms</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {selectedSymptoms.length} selected
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_SYMPTOMS.map((sym) => {
                const isSelected = selectedSymptoms.includes(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => toggleSymptom(sym)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      isSelected
                        ? 'bg-trust-600 text-white border-trust-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>

            {/* Custom symptom input */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
                placeholder="Type another symptom (e.g. eye irritation, chills)..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-500"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!customInput.trim()}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-900 text-xs font-bold transition disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          {/* Severity Radio */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-navy-900 uppercase tracking-wider">
              Symptom Severity
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'mild', label: 'Mild', desc: 'Manageable at home' },
                { id: 'moderate', label: 'Moderate', desc: 'Impacts daily routine' },
                { id: 'severe', label: 'Severe', desc: 'Requires medical care' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeverity(s.id)}
                  className={`p-3 rounded-2xl border text-left transition ${
                    severity === s.id
                      ? 'border-trust-600 bg-trust-50/50 ring-2 ring-trust-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <p
                    className={`text-xs font-bold ${
                      severity === s.id ? 'text-trust-700' : 'text-navy-900'
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Area / Locality Confirmation */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-trust-600" />
              <span>Reporting Area / Locality</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                  Locality / Sector
                </span>
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g. Andheri West"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-trust-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                  City
                </span>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-trust-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                  PIN Code
                </span>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. 400053"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-trust-500"
                />
              </div>
            </div>
          </div>

          {/* Additional Notes (optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-navy-900 uppercase tracking-wider">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Started 2 days ago after sudden weather change..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-500"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedSymptoms.length === 0}
              className="px-5 py-2.5 bg-trust-600 hover:bg-trust-700 text-white text-xs font-extrabold rounded-xl transition shadow-md shadow-trust-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Symptoms</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
