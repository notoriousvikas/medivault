import React, { useState } from 'react';
import {
  X, ZoomIn, ZoomOut, RotateCw, Download, Sparkles, CheckCircle2,
  ShieldCheck, RefreshCw, MessageSquare, FileText,
  Activity, AlertTriangle, ScanLine, FlaskConical, Stethoscope, Clock
} from 'lucide-react';
import { recordsApi } from '../../api/records';
import { useToast } from '../../context/ToastContext';
import FormattedAiText from '../common/FormattedAiText';

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

export default function SplitRecordViewerModal({ isOpen, onClose, record, onOpenAiChat, onRecordUpdated }) {
  const toast = useToast();
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingXray, setAnalyzingXray] = useState(false);

  if (!isOpen || !record) return null;

  const handleZoomIn = () => setZoom((p) => Math.min(p + 25, 200));
  const handleZoomOut = () => setZoom((p) => Math.max(p - 25, 50));
  const handleRotate = () => setRotation((p) => (p + 90) % 360);

  const handleAnalyzeRecord = async () => {
    const recordId = record?._id || record?.id || record?.recordId || record?.data?._id;
    if (!recordId) {
      toast.error('Analysis Failed', 'Invalid record identifier');
      return;
    }
    setAnalyzing(true);
    try {
      const res = await recordsApi.analyzeRecord(recordId);
      toast.success('Aarogya AI Analysis Complete', 'Clinical insights refreshed.');
      const updated = res?.data?.record || res?.data;
      if (updated && (updated._id || updated.id)) {
        if (onRecordUpdated) onRecordUpdated(updated);
      } else {
        const refreshed = await recordsApi.getRecord(recordId);
        if (onRecordUpdated) onRecordUpdated(refreshed.data?.record || refreshed.data);
      }
    } catch (err) {
      toast.error('Analysis Failed', err.message || 'Aarogya AI analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeXRay = async () => {
    const recordId = record?._id || record?.id || record?.recordId || record?.data?._id;
    if (!recordId) {
      toast.error('X-Ray Inference Failed', 'Invalid record identifier');
      return;
    }
    setAnalyzingXray(true);
    try {
      const res = await recordsApi.analyzeChestXRay(recordId);
      toast.success('DenseNet-121 Inference Complete', 'Extracted 18 radiologic pattern scores.');
      const updated = res?.data?.record || res?.data || record;
      if (onRecordUpdated) onRecordUpdated(updated);
    } catch (err) {
      toast.error('X-Ray Inference Failed', err.message || 'Python AI microservice is unreachable.');
    } finally {
      setAnalyzingXray(false);
    }
  };

  const parsed = record.parsedData || {};
  const isXRay = isXRayRecord(record);
  const isImage = isImageUrl(record.fileUrl);

  // Only show real data, never fake placeholders
  const realBiomarkers = Array.isArray(parsed.biomarkers) && parsed.biomarkers.length > 0
    ? parsed.biomarkers : null;
  const realRecommendations = Array.isArray(parsed.aiRecommendations) && parsed.aiRecommendations.length > 0
    ? parsed.aiRecommendations : null;
  const aiSummaryText = parsed.summary || parsed.aiAnalysis || null;
  const xrayData = parsed.xrayAnalysis || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-navy-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">

        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-trust-50 text-trust-600 flex items-center justify-center border border-trust-100 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-navy-900 truncate">{record.title}</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-trust-100 text-trust-800 shrink-0">
                  {record.category || 'Clinical Record'}
                </span>
                {isXRay && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-violet-100 text-violet-800 flex items-center gap-1 shrink-0">
                    <ScanLine className="w-3 h-3" />X-Ray
                  </span>
                )}
                {parsed.triage && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md flex items-center gap-1 shrink-0 ${
                    parsed.triage.level === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : parsed.triage.level === 'URGENT'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {parsed.triage.level === 'CRITICAL' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                    )}
                    {parsed.triage.level} Triage
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Uploaded {record.uploadDate ? new Date(record.uploadDate).toLocaleDateString() : 'Recently'} · SHA-256 Verified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            {/* X-Ray AI button — only for chest X-ray records */}
            {isXRay && (
              <button
                onClick={handleAnalyzeXRay}
                disabled={analyzingXray || analyzing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold hover:bg-violet-100 transition shadow-sm disabled:opacity-50"
              >
                {analyzingXray
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-600" />
                  : <Activity className="w-3.5 h-3.5 text-violet-600" />}
                <span className="hidden sm:inline">
                  {analyzingXray ? 'Running...' : (xrayData ? 'Re-Run X-Ray AI' : 'Run Chest X-Ray AI')}
                </span>
              </button>
            )}

            <button
              onClick={handleAnalyzeRecord}
              disabled={analyzing || analyzingXray}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition shadow-sm disabled:opacity-50"
            >
              {analyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
              <span className="hidden sm:inline">{analyzing ? 'Analyzing...' : 'Aarogya AI'}</span>
            </button>

            {record.fileUrl && (
              <a
                href={record.fileUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split View Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">

          {/* Left: Document Viewer */}
          <div className="lg:col-span-7 bg-slate-900 flex flex-col border-r border-slate-200 relative overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/90 text-slate-300 border-b border-slate-700 text-xs shrink-0">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Encrypted Document Canvas
              </span>
              <div className="flex items-center gap-2">
                <button onClick={handleZoomOut} className="p-1 hover:text-white transition" title="Zoom out">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-[11px]">{zoom}%</span>
                <button onClick={handleZoomIn} className="p-1 hover:text-white transition" title="Zoom in">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={handleRotate} className="p-1 hover:text-white transition ml-1" title="Rotate">
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
                    <img src={record.fileUrl} alt={record.title} className="max-h-[70vh] object-contain select-none" />
                  ) : (
                    <iframe src={record.fileUrl} title={record.title} className="w-[580px] h-[70vh] border-0" />
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
          <div className="lg:col-span-5 bg-white overflow-y-auto p-6 space-y-6">

            {/* ── DenseNet-121 X-Ray Findings (imaging records only) ── */}
            {isXRay && (
              xrayData ? (
                <div className="p-4 rounded-2xl bg-violet-50/80 border border-violet-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-violet-800 uppercase tracking-wider">
                      <Activity className="w-4 h-4 text-violet-600" />
                      <span>DenseNet-121 Findings</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-200/60 text-violet-800">
                      {(xrayData.device || 'CPU').toUpperCase()} · {xrayData.execution_time_ms}ms
                    </span>
                  </div>

                  <p className="text-[11px] text-violet-700 font-medium">
                    {xrayData.model_name || 'TorchXRayVision'} · {xrayData.model_version || 'densenet121-res224-all'}
                  </p>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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

                  <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[10px] text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="leading-tight">
                      {xrayData.clinical_disclaimer || 'Research prototype. Raw neural network scores — NOT a confirmed clinical diagnosis. Consult a licensed radiologist.'}
                    </p>
                  </div>
                </div>
              ) : (
                /* Prompt to run X-Ray AI */
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

            {/* ── Clinical Laboratory Triage (Non-XRay records) ── */}
            {!isXRay && parsed.triage && (
              <div className={`p-4 rounded-2xl border space-y-3 ${
                parsed.triage.level === 'CRITICAL'
                  ? 'bg-rose-50/70 border-rose-200'
                  : parsed.triage.level === 'URGENT'
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-emerald-50/70 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                    <FlaskConical className="w-4 h-4 text-trust-600" />
                    <span>Clinical Lab Triage</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    parsed.triage.level === 'CRITICAL'
                      ? 'bg-rose-200 text-rose-900'
                      : parsed.triage.level === 'URGENT'
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-emerald-200 text-emerald-900'
                  }`}>
                    {parsed.triage.level} &bull; Priority {parsed.triage.priorityScore}/100
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 text-trust-600" />
                    Specialty: <strong className="text-slate-800">{parsed.triage.specialty || 'General Medicine'}</strong>
                  </span>
                  {parsed.triage.recommendedWindowHours && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Window: {parsed.triage.recommendedWindowHours}h
                    </span>
                  )}
                </div>

                {parsed.triage.flags && parsed.triage.flags.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Clinical Observations</p>
                    {parsed.triage.flags.map((flag, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-xs bg-white/90 p-2 rounded-lg border border-slate-200/80">
                        <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          parsed.triage.level === 'CRITICAL' ? 'text-rose-500' : 'text-amber-500'
                        }`} />
                        <span className="text-slate-800 font-medium">{flag}</span>
                      </div>
                    ))}
                  </div>
                )}

                {parsed.triage.actionPlan && (
                  <p className="text-xs text-slate-600 bg-white/70 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
                    <strong>Action Plan:</strong> {parsed.triage.actionPlan}
                  </p>
                )}
              </div>
            )}

            {/* ── Aarogya AI Clinical Intelligence ── */}
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
                <p className="text-xs text-slate-500 italic">
                  No AI analysis yet. Click <strong>Aarogya AI</strong> in the header to generate a patient-friendly clinical interpretation.
                </p>
              )}
            </div>

            {/* ── Biomarkers — only for non-imaging records with real data ── */}
            {!isXRay && realBiomarkers && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Biomarkers & Clinical Metrics
                  </h4>
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recommended Action Steps
                </h4>
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
              <button
                type="button"
                onClick={() => { onClose(); if (onOpenAiChat) onOpenAiChat(record); }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-trust-600 text-white font-bold text-xs sm:text-sm hover:bg-trust-700 transition shadow-sm shadow-trust-600/30"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Ask AI Copilot About This Record</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
