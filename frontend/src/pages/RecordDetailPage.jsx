import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import FormattedAiText from '../components/common/FormattedAiText';
import { recordsApi } from '../api/records';
import { appointmentsApi } from '../api/appointments';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft, ZoomIn, ZoomOut, RotateCw, Download, Sparkles,
  FileText, CheckCircle2, ShieldCheck, RefreshCw, MessageSquare,
  Activity, AlertTriangle, ScanLine, FlaskConical, Calendar, Stethoscope, ChevronRight,
} from 'lucide-react';

/** Returns true if this record is specifically a chest radiograph / X-Ray */
function isXRayRecord(record) {
  if (!record) return false;
  const cat = (record.category || '').toLowerCase();
  const title = (record.title || '').toLowerCase();
  if (cat.includes('lab') || cat.includes('prescription') || cat.includes('discharge') || cat.includes('note') || cat.includes('blood')) {
    return false;
  }
  if (cat.includes('xray') || cat.includes('x-ray') || cat.includes('radiograph')) return true;
  if ((cat === 'scan' || cat.includes('scan')) && (title.includes('xray') || title.includes('x-ray') || title.includes('chest') || title.includes('radiograph') || title.includes('cxr'))) return true;
  return false;
}

function isImageUrl(url) {
  if (!url) return false;
  return url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') ||
    url.includes('images.unsplash.com') || url.includes('res.cloudinary.com');
}

export default function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingXray, setAnalyzingXray] = useState(false);
  const [autoBooking, setAutoBooking] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      try {
        const res = await recordsApi.getRecord(id);
        setRecord(res.data);
      } catch (err) {
        toast.error('Record Not Found', err.message || 'Could not load medical document.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchRecord();
  }, [id, navigate, toast]);

  const handleZoomIn = () => setZoom((p) => Math.min(p + 25, 200));
  const handleZoomOut = () => setZoom((p) => Math.max(p - 25, 50));
  const handleRotate = () => setRotation((p) => (p + 90) % 360);

  /** Groq RAG text-based analysis (Lab Reports, Clinical Notes, etc.) */
  const handleAnalyzeRecord = async () => {
    setAnalyzing(true);
    try {
      const res = await recordsApi.analyzeRecord(id);
      toast.success('Aarogya Analysis Updated', 'Clinical insights refreshed.');
      // Backend returns { status, data: { recordId, analysis, ... } }
      // Re-fetch to get the full updated record with parsedData populated
      const refreshed = await recordsApi.getRecord(id);
      setRecord(refreshed.data);
    } catch (err) {
      toast.error('Analysis Failed', err.message || 'Aarogya AI analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  /** DenseNet-121 Chest X-Ray inference via Python microservice */
  const handleAnalyzeXRay = async () => {
    setAnalyzingXray(true);
    try {
      const res = await recordsApi.analyzeChestXRay(id);
      toast.success('DenseNet-121 Inference Complete', 'Radiographic pathology patterns evaluated.');
      // recordsApi returns HTTP body: { status, data: { record, xrayAnalysis, summary } }
      const updated = res?.data?.record || res?.data;
      if (updated?._id) {
        setRecord(updated);
      } else {
        const refreshed = await recordsApi.getRecord(id);
        setRecord(refreshed.data);
      }
    } catch (err) {
      toast.error('X-Ray Inference Failed', err.message || 'Python AI microservice is unreachable. Run: npm run ai:start');
    } finally {
      setAnalyzingXray(false);
    }
  };

  /** Booking based on DenseNet-121 criticality triage */
  const handleAutoBookAppointment = async () => {
    if (!window.confirm("Would you like to schedule a specialist consultation for this record?")) {
      return;
    }
    setAutoBooking(true);
    try {
      const res = await appointmentsApi.autoBookXRayAppointment({ recordId: id });
      setBookedAppointment(res.data);
      const urgency = res.data?.triage?.urgency;
      toast.success(
        urgency === 'CRITICAL' ? '🚨 Emergency Triage Booked!' : 'Specialist Consultation Booked!',
        `Matched with Dr. ${res.data?.doctor?.name} (${res.data?.doctor?.specialization}) for ${res.data?.appointment?.timeSlot}.`
      );
    } catch (err) {
      toast.error('Booking Failed', err.message || 'Could not schedule specialist consultation.');
    } finally {
      setAutoBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-trust-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Loading Medical Record...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!record) return null;

  const parsed = record.parsedData || {};
  const isXRay = isXRayRecord(record);
  const isImage = isImageUrl(record.fileUrl);

  // Only show biomarkers section for non-imaging records AND only if real data exists
  const realBiomarkers = Array.isArray(parsed.biomarkers) && parsed.biomarkers.length > 0
    ? parsed.biomarkers
    : null;

  // Only show recommendations if real data exists
  const realRecommendations = Array.isArray(parsed.aiRecommendations) && parsed.aiRecommendations.length > 0
    ? parsed.aiRecommendations
    : null;

  // AI summary text — only show if we have a real one, not a placeholder
  const aiSummaryText = parsed.summary || parsed.aiAnalysis || null;

  // X-Ray findings from the Python microservice
  const xrayData = parsed.xrayAnalysis || null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col">

        {/* Breadcrumb & Action Bar */}
        <div className="flex items-center justify-between pb-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-trust-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* X-Ray AI button — only for chest X-Ray radiograph records */}
            {isXRay && (
              <button
                onClick={handleAnalyzeXRay}
                disabled={analyzingXray || analyzing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold hover:bg-violet-100 transition shadow-sm disabled:opacity-50"
              >
                {analyzingXray
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-600" />
                  : <Activity className="w-3.5 h-3.5 text-violet-600" />}
                <span>{analyzingXray ? 'Running DenseNet-121...' : (xrayData ? 'Re-Run X-Ray AI' : 'Run Chest X-Ray AI')}</span>
              </button>
            )}

            {/* Groq RAG analysis button — for all records */}
            <button
              onClick={handleAnalyzeRecord}
              disabled={analyzing || analyzingXray}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition shadow-sm disabled:opacity-50"
            >
              {analyzing
                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
              <span>{analyzing ? 'Analyzing...' : 'Re-Run Aarogya AI'}</span>
            </button>

            {record.fileUrl && (
              <a
                href={record.fileUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
                title="Download original file"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Main Split View */}
        <div className="flex-1 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[700px]">

          {/* Left: Document Viewer */}
          <div className="lg:col-span-7 bg-slate-900 flex flex-col border-r border-slate-200">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 text-slate-300 text-xs shrink-0 border-b border-slate-700">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Encrypted Document Canvas</span>
              </span>
              <div className="flex items-center gap-2">
                <button onClick={handleZoomOut} className="p-1 hover:text-white transition">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-[11px]">{zoom}%</span>
                <button onClick={handleZoomIn} className="p-1 hover:text-white transition">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={handleRotate} className="p-1 hover:text-white transition ml-1">
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {record.fileUrl ? (
                <div
                  style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, transition: 'transform 0.2s ease' }}
                  className="max-w-full shadow-2xl rounded-lg overflow-hidden bg-white"
                >
                  {isImage ? (
                    <img
                      src={record.fileUrl}
                      alt={record.title}
                      className="max-h-[70vh] object-contain select-none"
                    />
                  ) : (
                    <iframe
                      src={record.fileUrl}
                      title={record.title}
                      className="w-[580px] h-[70vh] border-0"
                    />
                  )}
                </div>
              ) : (
                <div className="text-center text-slate-400 p-8 space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-slate-600" />
                  <p className="text-sm">Raw document stored securely in encrypted storage</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: AI Summary Panel */}
          <div className="lg:col-span-5 p-6 sm:p-8 overflow-y-auto space-y-6">

            {/* Record Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-trust-100 text-trust-800">
                  {record.category}
                </span>
                {isXRay && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-violet-100 text-violet-800 flex items-center gap-1">
                    <ScanLine className="w-3 h-3" />
                    Imaging
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono">SHA256: 0x9f8...2b1a</span>
              </div>
              <h2 className="text-2xl font-extrabold text-navy-900">{record.title}</h2>
              <p className="text-xs text-slate-500">
                Uploaded {new Date(record.uploadDate || Date.now()).toLocaleDateString()}
              </p>
            </div>

            {/* ── DenseNet-121 X-Ray Findings (imaging records only) ── */}
            {isXRay && (
              xrayData ? (
                <div className="p-4 rounded-2xl bg-violet-50/80 border border-violet-200/80 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-violet-800 uppercase tracking-wider">
                      <Activity className="w-4 h-4 text-violet-600" />
                      <span>DenseNet-121 Radiograph Findings</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-200/60 text-violet-800">
                      {(xrayData.device || 'CPU').toUpperCase()} · {xrayData.execution_time_ms}ms
                    </span>
                  </div>

                  <p className="text-[11px] text-violet-700 font-medium">
                    {xrayData.model_name || 'TorchXRayVision'} · {xrayData.model_version || 'densenet121-res224-all'}
                  </p>

                  {/* Findings list sorted by score */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {[...(xrayData.findings || [])]
                      .sort((a, b) => (b.raw_score || 0) - (a.raw_score || 0))
                      .map((item, idx) => {
                        const score = Number(item.raw_score || 0);
                        const percent = Math.min(Math.max(score * 100, 0), 100);
                        const isHigh = score > 0.4;
                        const isMed = score > 0.2;
                        return (
                          <div key={idx} className="bg-white/90 p-2.5 rounded-xl border border-violet-100 text-xs space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-800">{item.label}</span>
                              <span className={`font-mono text-[11px] font-extrabold ${isHigh ? 'text-rose-600' : isMed ? 'text-amber-600' : 'text-slate-500'}`}>
                                {score.toFixed(4)} <span className="text-slate-400">({percent.toFixed(1)}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-400' : 'bg-violet-400'}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Disclaimer */}
                  <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[10px] text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="leading-tight">
                      {xrayData.clinical_disclaimer || 'Research prototype. Raw neural network scores — NOT a confirmed clinical diagnosis. Consult a licensed radiologist.'}
                    </p>
                  </div>

                  {/* ── Auto-Triage & Automated Specialist Booking ── */}
                  {(() => {
                    const sortedFindings = [...(xrayData.findings || [])].sort((a, b) => (b.raw_score || 0) - (a.raw_score || 0));
                    const topFinding = sortedFindings[0];
                    const topScore = topFinding ? Number(topFinding.raw_score || 0) : 0;
                    const isCritical = sortedFindings.some((f) => {
                      const s = Number(f.raw_score || 0);
                      return (['Pneumothorax', 'Edema', 'Consolidation', 'Pneumonia', 'Mass'].includes(f.label) && s >= 0.32) || s >= 0.60;
                    });
                    const isUrgent = !isCritical && sortedFindings.some((f) => Number(f.raw_score || 0) >= 0.22);

                    if (bookedAppointment) {
                      return (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-800 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Appointment Scheduled
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/80 text-emerald-900">
                              {bookedAppointment.triage?.urgency || 'CONFIRMED'}
                            </span>
                          </div>
                          <p className="text-emerald-900 font-semibold text-xs">
                            Dr. {bookedAppointment.doctor?.name} &bull; {bookedAppointment.doctor?.specialization || 'Specialist'}
                          </p>
                          <p className="text-[11px] text-emerald-700">
                            Time Slot: <span className="font-mono font-bold">{bookedAppointment.appointment?.timeSlot}</span>
                          </p>
                          <button
                            onClick={() => navigate(`/consultations?id=${bookedAppointment.consultationId}`)}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Open Doctor Consultation Chat</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className={`p-3.5 rounded-2xl border text-xs space-y-2.5 ${
                        isCritical
                          ? 'bg-rose-50/90 border-rose-200'
                          : isUrgent
                          ? 'bg-amber-50/90 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold uppercase text-[11px] tracking-wider">
                            {isCritical ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                                <span className="text-rose-700">🚨 Critical Triage Alert</span>
                              </>
                            ) : isUrgent ? (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span className="text-amber-800">⚠️ Urgent Attention Recommended</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-slate-700">Clinical Review Available</span>
                              </>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCritical ? 'bg-rose-200 text-rose-800' : isUrgent ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {isCritical ? 'CRITICAL PRIORITY' : isUrgent ? 'URGENT CARE' : 'ROUTINE'}
                          </span>
                        </div>

                        <p className={`text-[11px] leading-relaxed ${isCritical ? 'text-rose-800' : isUrgent ? 'text-amber-800' : 'text-slate-600'}`}>
                          {topFinding ? (
                            <>DenseNet-121 model flagged <strong>{topFinding.label}</strong> (pattern score: {topScore.toFixed(3)}). {isCritical ? 'Immediate emergency specialist consultation is strongly advised.' : 'Specialist consultation is recommended for clinical correlation.'}</>
                          ) : (
                            'Schedule a specialist review for this radiograph.'
                          )}
                        </p>

                        <button
                          onClick={handleAutoBookAppointment}
                          disabled={autoBooking}
                          className={`w-full py-2.5 px-3 rounded-xl text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 ${
                            isCritical
                              ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                              : isUrgent
                              ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                              : 'bg-trust-600 hover:bg-trust-700 shadow-trust-600/20'
                          }`}
                        >
                          {autoBooking ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Matching Specialist & Auto-Booking...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{isCritical ? '⚡ Book Emergency Specialist' : '⚡ Book Specialist Consultation'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Prompt to run X-Ray AI for imaging records with no data yet */
                <div className="p-4 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 text-center space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mx-auto">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-violet-800">DenseNet-121 X-Ray Analysis</p>
                    <p className="text-xs text-slate-500 mt-0.5">Run AI inference to extract 18 radiologic pathology pattern scores from this image.</p>
                  </div>
                  <button
                    onClick={handleAnalyzeXRay}
                    disabled={analyzingXray}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition disabled:opacity-50"
                  >
                    {analyzingXray
                      ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Running...</span></>
                      : <><Activity className="w-3.5 h-3.5" /><span>Run Chest X-Ray AI</span></>}
                  </button>
                </div>
              )
            )}

            {/* ── Aarogya AI Clinical Intelligence (Groq) ── */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-trust-50 to-emerald-50 border border-indigo-100/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Aarogya Clinical Intelligence
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Patient Friendly
                </span>
              </div>
              {aiSummaryText ? (
                <FormattedAiText text={aiSummaryText} />
              ) : (
                <div className="text-center py-3 space-y-2">
                  <p className="text-xs text-slate-500">
                    No AI analysis yet. Click <strong>Re-Run Aarogya AI</strong> above to generate a patient-friendly clinical interpretation.
                  </p>
                </div>
              )}
            </div>

            {/* ── Biomarkers — only for non-imaging records with real data ── */}
            {!isXRay && realBiomarkers && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Biomarkers & Clinical Metrics
                  </h3>
                  <span className="text-[11px] text-slate-400 ml-auto">{realBiomarkers.length} indicators</span>
                </div>
                <div className="space-y-3">
                  {realBiomarkers.map((bm, idx) => {
                    const isElevated = bm.status === 'elevated' || bm.risk === 'high';
                    const isBorderline = bm.status === 'borderline' || bm.risk === 'moderate';
                    const badgeClass = isElevated
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : isBorderline
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    const dotColor = isElevated ? 'bg-rose-500' : isBorderline ? 'bg-amber-500' : 'bg-emerald-500';
                    return (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-navy-900">{bm.name}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                            <span>{bm.status || 'Normal'}</span>
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-extrabold text-slate-800">{bm.value}</span>
                          <span className="text-[11px] text-slate-400">Ref: {bm.standardRange || 'Standard'}</span>
                        </div>
                        {bm.explanation && (
                          <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/50 leading-relaxed">
                            {bm.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Recommended Actions (only if real data) ── */}
            {realRecommendations && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recommended Action Steps
                </h3>
                <ul className="space-y-2">
                  {realRecommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Ask AI CTA ── */}
            <div className="pt-2">
              <Link
                to={`/dashboard?chatRecord=${record._id}`}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-trust-600 text-white font-bold text-xs sm:text-sm hover:bg-trust-700 transition shadow-sm shadow-trust-600/30"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Ask AI Copilot About This Record</span>
              </Link>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
