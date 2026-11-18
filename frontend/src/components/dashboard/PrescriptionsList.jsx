import React, { useState } from 'react';
import { Pill, AlertCircle, Sparkles, CheckCircle2, Plus, Clock, User, Building, Trash2, RefreshCw } from 'lucide-react';
import { prescriptionsApi } from '../../api/prescriptions';
import { useToast } from '../../context/ToastContext';

export default function PrescriptionsList({ prescriptions = [], onPrescriptionAdded, onPrescriptionDeleted, onPrescriptionUpdated }) {
  const toast = useToast();
  const [analyzingId, setAnalyzingId] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAnalyze = async (id) => {
    setAnalyzingId(id);
    try {
      const res = await prescriptionsApi.analyzePrescription(id);
      toast.success('Prescription AI Safety Check Complete', 'Aarogya AI evaluated drug interactions and contraindications.');
      if (onPrescriptionUpdated) onPrescriptionUpdated(res.data);
    } catch (err) {
      toast.error('AI Check Failed', err.message || 'Could not analyze prescription.');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Remove this prescription?')) return;
    try {
      await prescriptionsApi.deletePrescription(id);
      toast.info('Prescription Removed', 'The medication has been removed from your active list.');
      if (onPrescriptionDeleted) onPrescriptionDeleted(id);
    } catch (err) {
      toast.error('Delete Failed', err.message || 'Could not delete prescription.');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!doctorName || !medName) {
      toast.error('Fields Required', 'Please enter prescribing doctor and medication name.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        doctorName,
        diagnosis,
        medications: [
          {
            name: medName,
            dosage: dosage || 'As directed',
            frequency: frequency || 'Daily',
            instructions: 'Take with food/water',
          },
        ],
      };
      const res = await prescriptionsApi.createPrescription(payload);
      toast.success('Prescription Added', 'New medication successfully registered in your vault.');
      setIsAddOpen(false);
      setDoctorName('');
      setDiagnosis('');
      setMedName('');
      setDosage('');
      setFrequency('');
      if (onPrescriptionAdded) onPrescriptionAdded(res.data);
    } catch (err) {
      toast.error('Add Failed', err.message || 'Could not add prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-navy-900">Active Prescriptions & Medications</h3>
          <p className="text-xs text-slate-500">Live clinical dosage regimens and Aarogya AI safety checks</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(!isAddOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Medication</span>
        </button>
      </div>

      {/* Add Medication Drawer/Form */}
      {isAddOpen && (
        <form onSubmit={handleAddSubmit} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
          <div className="font-bold text-xs uppercase tracking-wider text-slate-700">Add New Prescription</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Prescribing Physician (e.g. Dr. Vance, MD)"
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-trust-500"
            />
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Clinical Indication (e.g. Type 1 Diabetes, Hypertension)"
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-trust-500"
            />
            <input
              type="text"
              required
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              placeholder="Medication Name (e.g. Metformin, Lisinopril)"
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-trust-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="Dosage (500mg)"
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-trust-500"
              />
              <input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="Frequency (2x daily)"
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-trust-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-lg bg-trust-600 text-white text-xs font-bold hover:bg-trust-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Prescription'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {prescriptions.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 space-y-2">
          <Pill className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No active prescriptions registered</p>
          <p className="text-xs text-slate-400">Add medications to enable automatic Aarogya AI drug interaction screening.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map((rx) => (
            <div
              key={rx._id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h4 className="font-bold text-navy-900 text-sm">
                      {rx.doctorName || 'Attending Physician'}
                    </h4>
                  </div>
                  {rx.diagnosis && (
                    <p className="text-xs text-slate-500 mt-0.5">{rx.diagnosis}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAnalyze(rx._id)}
                    disabled={analyzingId === rx._id}
                    title="Aarogya AI Drug Interaction Check"
                    className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                  >
                    {analyzingId === rx._id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(rx._id, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Medications List */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {(rx.medications || []).map((med, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50/70 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-navy-900">
                      <span>{med.name}</span>
                      <span className="text-trust-600 font-mono text-[11px]">{med.dosage}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>{med.frequency}</span>
                      {med.duration && <span>{med.duration}</span>}
                    </div>
                    {med.instructions && (
                      <p className="text-[10px] text-slate-400 italic">{med.instructions}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* AI Analysis Result if present */}
              {rx.parsedData?.aiAnalysis && (
                <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-1">
                  <span className="font-bold flex items-center gap-1 text-[11px] text-indigo-700 uppercase">
                    <Sparkles className="w-3 h-3" />
                    AI Safety Assessment
                  </span>
                  <p className="text-[11px] leading-relaxed line-clamp-3">
                    {rx.parsedData.aiAnalysis}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
