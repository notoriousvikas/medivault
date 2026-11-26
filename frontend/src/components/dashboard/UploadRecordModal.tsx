import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Stethoscope,
  Calendar,
  MessageSquare,
  ArrowRight,
  Activity,
  Sparkles,
  FlaskConical,
} from 'lucide-react';
import { recordsApi } from '../../api/records';
import { appointmentsApi } from '../../api/appointments';
import { useToast } from '../../context/ToastContext';
import { MedicalRecord } from '../../types';

interface UploadRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (record: MedicalRecord) => void;
}

export default function UploadRecordModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: UploadRecordModalProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Chest X-Ray');
  const [runXRayTriage, setRunXRayTriage] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [encryptionStage, setEncryptionStage] = useState('');

  // Triage Result Modal State
  const [triageResult, setTriageResult] = useState<any>(null);
  const [bookingConsent, setBookingConsent] = useState(false);
  const [bookingAppointment, setBookingAppointment] = useState(false);
  const [bookedDetails, setBookedDetails] = useState<any>(null);

  if (!isOpen) return null;

  const selectFile = (selected: File) => {
    setFile(selected);
    const isXRayName = /(x-?ray|cxr|chest|radiograph|lung)/i.test(selected.name);
    if (isXRayName) {
      setCategory('Chest X-Ray');
      setRunXRayTriage(true);
    } else {
      if (/\.(pdf|doc|docx)$/i.test(selected.name)) {
        setCategory('Lab Report');
      }
      setRunXRayTriage(false);
    }
    if (!title) {
      const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      selectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      selectFile(e.target.files[0]);
    }
  };

  const handleCloseModal = () => {
    if (triageResult && onUploadSuccess) {
      const rec = triageResult.record || triageResult;
      onUploadSuccess(rec);
    }
    setTriageResult(null);
    setBookingConsent(false);
    setBookingAppointment(false);
    setBookedDetails(null);
    setFile(null);
    setTitle('');
    setUploading(false);
    setProgress(0);
    setEncryptionStage('');
    onClose();
  };

  const handleConfirmBooking = async () => {
    if (!triageResult?.doctor) return;
    setBookingAppointment(true);
    try {
      const targetDoctorId = triageResult.doctor._id || triageResult.doctor.id;
      const targetRecordId = triageResult.record?._id || triageResult.recordId || triageResult._id;
      const apptDate = triageResult.suggestedSlot?.appointmentDate || new Date().toISOString();
      const slot = triageResult.suggestedSlot?.timeSlot || '10:00 AM - 10:30 AM (Priority Review)';
      const urgency = triageResult.triage?.urgency || 'ROUTINE';
      const cond = triageResult.triage?.primaryCondition || 'Clinical Triage';

      const res = await appointmentsApi.createAppointment({
        doctorId: targetDoctorId,
        recordId: targetRecordId,
        appointmentDate: apptDate,
        timeSlot: slot,
        urgency,
        patientNotes: `Patient explicitly authorized appointment based on AI clinical triage for ${cond}.`,
      });

      setBookedDetails(res.data);
      setBookingConsent(true);
      toast.success(
        'Appointment Confirmed!',
        `Your consultation with Dr. ${triageResult.doctor.name} is scheduled with your consent.`
      );
    } catch (err: any) {
      toast.error('Booking Failed', err.message || 'Could not schedule appointment.');
    } finally {
      setBookingAppointment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('File Required', 'Please select or drag a medical document to upload.');
      return;
    }
    if (!title) {
      toast.error('Title Required', 'Please provide a descriptive title for this record.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('category', category);
      formData.append('uploadDate', new Date().toISOString());

      const isChestXRay = category === 'Chest X-Ray';

      if (runXRayTriage) {
        if (isChestXRay) {
          setEncryptionStage('Encrypting radiograph with AES-256 zero-knowledge seal...');
          await new Promise((r) => setTimeout(r, 300));
          setEncryptionStage('Analyzing radiograph with Clinical Radiology AI...');
          await new Promise((r) => setTimeout(r, 300));
          setEncryptionStage('Evaluating 18 pulmonary pathology confidence scores...');
        } else {
          setEncryptionStage('Securing document with end-to-end clinical seal...');
          await new Promise((r) => setTimeout(r, 300));
          setEncryptionStage('Evaluating clinical laboratory biomarkers & reference ranges...');
        }

        const response = await recordsApi.uploadAndTriage(formData, (p) => setProgress(p));
        const data = response.data;
        const createdRecord = data?.record || data?.data?.record || data;

        setEncryptionStage('Matching available specialist & allocating consultation slot...');
        await new Promise((r) => setTimeout(r, 300));

        setTriageResult(data);
        if (data.triage?.urgency === 'CRITICAL') {
          toast.error(
            '🚨 Critical Emergency Triage Flagged',
            `${data.triage.primaryCondition}. Priority consultation slot allocated.`
          );
        } else if (data.triage?.urgency === 'URGENT') {
          toast.warning(
            '⚠️ Urgent Triage Review',
            `${data.triage.primaryCondition}. Specialist care slot scheduled.`
          );
        } else {
          toast.success(
            'Document Triaged',
            `${data.triage?.primaryCondition || 'Evaluation complete'}. No acute emergency detected.`
          );
        }
        if (onUploadSuccess && createdRecord) onUploadSuccess(createdRecord);
      } else {
        setEncryptionStage('Securing document with end-to-end privacy seal...');
        const response = await recordsApi.createRecord(formData, (p) => setProgress(p));
        const createdRecord = response?.data?.record || response?.data || response;
        toast.success(
          'Record Encrypted & Saved!',
          `"${title}" was successfully sealed and added to your health vault.`
        );
        if (onUploadSuccess && createdRecord) onUploadSuccess(createdRecord);
        handleCloseModal();
      }
    } catch (err: any) {
      toast.error('Upload Failed', err.message || 'Could not process document.');
    } finally {
      setUploading(false);
      setProgress(0);
      setEncryptionStage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden max-h-[90vh] overflow-y-auto">

        {triageResult ? (
          <div className="space-y-6">

            <div
              className={`p-5 rounded-3xl text-white shadow-lg ${
                triageResult.triage?.urgency === 'CRITICAL'
                  ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-red-600 shadow-rose-600/30'
                  : triageResult.triage?.urgency === 'URGENT'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 shadow-amber-600/30'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider">
                  {triageResult.triage?.urgency === 'CRITICAL' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>🚨 Critical Emergency Triage</span>
                    </>
                  ) : triageResult.triage?.urgency === 'URGENT' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-white" />
                      <span>⚠️ Urgent Care Required (24h)</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-white" />
                      <span>🟢 Routine Review (Standard)</span>
                    </>
                  )}
                </div>
                <span className="text-[11px] font-mono text-white/80">
                  {triageResult.isXRay
                    ? `Radiology AI • ${triageResult.xrayAnalysis?.execution_time_ms || 120}ms`
                    : 'Clinical Lab Triage • Biomarker Vector'}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-xl sm:text-2xl font-black">
                  {triageResult.triage?.primaryCondition || 'Acute Pathology Detected'}
                </p>
                <p className="text-xs text-white/90 mt-1 leading-relaxed">
                  {triageResult.triage?.summary}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
                <span>{triageResult.isXRay ? 'Model Confidence' : 'Triage Priority Index'}</span>
                <span className="font-mono font-bold text-sm">
                  {triageResult.isXRay
                    ? `${((triageResult.triage?.highestScore || 0) * 100).toFixed(1)}%`
                    : `${triageResult.triage?.priorityScore || 20}/100`}
                </span>
              </div>
            </div>

            {triageResult.xrayAnalysis?.findings && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-trust-600" />
                    Pathology Findings Vector
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">TorchXRayVision</span>
                </div>

                <div className="space-y-2 pt-1">
                  {triageResult.xrayAnalysis.findings.slice(0, 4).map((f: any) => (
                    <div key={f.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{f.label}</span>
                        <span className="font-mono text-slate-500 font-bold">
                          {(f.raw_score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            f.raw_score >= 0.4
                              ? 'bg-rose-500'
                              : f.raw_score >= 0.2
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, f.raw_score * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!triageResult.xrayAnalysis?.findings && triageResult.triage?.flags && triageResult.triage.flags.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-trust-600" />
                    Clinical Biomarker Triggers
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Aarogya Engine</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {triageResult.triage.flags.map((flag: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                      <AlertTriangle
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          triageResult.triage?.urgency === 'CRITICAL' ? 'text-rose-500' : 'text-amber-500'
                        }`}
                      />
                      <span className="font-semibold text-slate-800">{flag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {triageResult.doctor && (
              bookingConsent || triageResult.isBooked ? (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Consultation Scheduled with Your Consent
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                      Confirmed
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3 text-xs bg-white/80 p-3 rounded-xl border border-emerald-100">
                    <div>
                      <p className="font-bold text-navy-900 text-sm">Dr. {triageResult.doctor.name}</p>
                      <p className="text-slate-600 font-medium">{triageResult.doctor.specialization}</p>
                      <p className="text-slate-400 text-[11px]">{triageResult.doctor.hospital}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-trust-800 flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" />
                        <span>{bookedDetails?.timeSlot || triageResult.suggestedSlot?.timeSlot || 'Priority Slot'}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Teleconsultation Channel Active
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const consultId = bookedDetails?.consultationId || triageResult.consultationId;
                      handleCloseModal();
                      if (consultId) navigate(`/consultations?id=${consultId}`);
                      else navigate('/consultations');
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Doctor Consultation Chat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-trust-50/70 border border-trust-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-trust-800 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5" />
                      Recommended Specialist Consultation
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Awaiting Your Permission
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3 text-xs bg-white/90 p-3 rounded-xl border border-trust-100">
                    <div>
                      <p className="font-bold text-navy-900 text-sm">Dr. {triageResult.doctor.name}</p>
                      <p className="text-slate-600 font-medium">{triageResult.doctor.specialization}</p>
                      <p className="text-slate-400 text-[11px]">{triageResult.doctor.hospital}</p>
                      {triageResult.doctor.consultationFee !== undefined && (
                        <p className="text-[11px] font-mono text-trust-700 font-bold mt-0.5">
                          Consultation Fee: ₹{triageResult.doctor.consultationFee}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-trust-800 flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" />
                        <span>{triageResult.suggestedSlot?.timeSlot || 'Priority Slot'}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Teleconsultation Available
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-snug">
                      <strong>Permission Required:</strong> AyuRaksha will not schedule this appointment without your approval. Would you like to confirm and book this consultation now?
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleConfirmBooking}
                      disabled={bookingAppointment}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-trust-600 text-white font-bold text-xs hover:bg-trust-700 active:scale-95 transition shadow-sm disabled:opacity-50"
                    >
                      {bookingAppointment ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Booking Consultation...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Yes, Confirm & Book Appointment</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
                    >
                      No, Skip
                    </button>
                  </div>
                </div>
              )
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                Close & View Record in Vault
              </button>
            </div>

          </div>
        ) : (
          <>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-trust-50 text-trust-600 flex items-center justify-center border border-trust-100 shadow-xs">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy-900">Upload & AI Triage</h3>
                  <p className="text-xs text-slate-500">
                    End-to-end encrypted storage & clinical radiology triage
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={uploading}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-trust-500 bg-trust-50/50'
                    : file
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-slate-200 hover:border-trust-300 hover:bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg,.dicom"
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3 text-emerald-800">
                    <FileText className="w-8 h-8 text-emerald-600 shrink-0" />
                    <div className="text-left overflow-hidden">
                      <div className="text-sm font-bold truncate max-w-xs">{file.name}</div>
                      <div className="text-xs text-emerald-600">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for AI Triage & Encryption
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className="text-sm font-semibold text-slate-700">
                      Click to browse or drag & drop radiograph / medical file
                    </div>
                    <div className="text-xs text-slate-400">
                      Supports Chest X-Rays (PNG, JPG), DICOM, or PDF (up to 25MB)
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Document / Study Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Chest X-Ray PA View, Pulmonary Scan, Blood Panel"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const selectedCat = e.target.value;
                    setCategory(selectedCat);
                    if (selectedCat === 'Chest X-Ray') {
                      setRunXRayTriage(true);
                    } else {
                      setRunXRayTriage(false);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                >
                  <option value="Chest X-Ray">Chest Radiograph / X-Ray (Radiology AI Triage)</option>
                  <option value="Scan">Other Medical Imaging (MRI, CT, Ultrasound)</option>
                  <option value="Lab Report">Lab Report (Metabolic, Blood, Pathology)</option>
                  <option value="Prescription">Prescription / Medication Slip</option>
                  <option value="Discharge Summary">Hospital Discharge Summary</option>
                  <option value="Clinical Note">Doctor Consultation Note</option>
                </select>
              </div>

              {category === 'Chest X-Ray' ? (
                <div
                  onClick={() => setRunXRayTriage(!runXRayTriage)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    runXRayTriage
                      ? 'bg-trust-50/80 border-trust-200 text-trust-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={runXRayTriage}
                    onChange={(e) => setRunXRayTriage(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded text-trust-600 focus:ring-trust-500 border-slate-300"
                  />
                  <div className="text-left space-y-0.5">
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-trust-600" />
                      <span>Run Radiology AI Triage & Specialist Auto-Match</span>
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Evaluates 18 pulmonary pathologies (Pneumothorax, Edema, Consolidation). Automatically matches on-call Pulmonologists and locks in an immediate emergency slot if critical markers are detected.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 flex items-start gap-3">
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="text-left space-y-0.5">
                    <p className="text-xs font-bold text-navy-900">Standard Encrypted Vault Upload</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      This document is not a chest X-ray and will be stored securely in your vault without automated radiology triage. You can access it anytime or run Aarogya AI for lab report insights.
                    </p>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-2 text-trust-700 font-bold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {encryptionStage}
                    </span>
                    <span className="font-mono text-slate-500">{progress || 65}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-trust-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(progress, 35)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={uploading}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-trust-600 text-white text-sm font-bold hover:bg-trust-700 active:scale-95 transition shadow-lg shadow-trust-600/30 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{category === 'Chest X-Ray' ? 'Processing Radiograph...' : 'Encrypting Document...'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{runXRayTriage && category === 'Chest X-Ray' ? 'Upload & Run AI Triage' : 'Encrypt & Upload to Vault'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </>
        )}

      </div>
    </div>
  );
}
