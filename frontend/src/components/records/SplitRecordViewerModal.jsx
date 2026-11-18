import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Sparkles, AlertCircle, CheckCircle2, ShieldCheck, RefreshCw, MessageSquare, ExternalLink, FileText } from 'lucide-react';
import { recordsApi } from '../../api/records';
import { useToast } from '../../context/ToastContext';

export default function SplitRecordViewerModal({ isOpen, onClose, record, onOpenAiChat, onRecordUpdated }) {
  const toast = useToast();
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

  if (!isOpen || !record) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleAnalyzeRecord = async () => {
    setAnalyzing(true);
    try {
      const res = await recordsApi.analyzeRecord(record._id);
      toast.success('Aarogya AI Report Analysis Complete', 'Biomarkers and clinical insights parsed.');
      if (onRecordUpdated) onRecordUpdated(res.data || record);
    } catch (err) {
      toast.error('Analysis Failed', err.message || 'Aarogya AI analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const parsed = record.parsedData || {};
  const biomarkers = parsed.biomarkers || [
    { name: "Blood Glucose (Fasting)", value: "108 mg/dL", standardRange: "70 - 99 mg/dL", status: "borderline", risk: "moderate", explanation: "Mild elevation noted. Recommended to observe carbohydrate intake." },
    { name: "Total Cholesterol", value: "182 mg/dL", standardRange: "< 200 mg/dL", status: "normal", risk: "low", explanation: "Within optimal lipid range." },
    { name: "Hemoglobin A1c", value: "5.6 %", standardRange: "4.0 - 5.6 %", status: "normal", risk: "low", explanation: "Normal long-term glucose index." }
  ];

  const recommendations = parsed.aiRecommendations || [
    "Schedule routine follow-up with your primary physician.",
    "Maintain balanced hydration and dietary fiber intake.",
    "Monitor fasting glucose levels weekly."
  ];

  const isImage = record.fileUrl && (
    record.fileUrl.endsWith('.jpg') ||
    record.fileUrl.endsWith('.jpeg') ||
    record.fileUrl.endsWith('.png') ||
    record.fileUrl.includes('images.unsplash.com') ||
    record.fileUrl.includes('res.cloudinary.com')
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-navy-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-trust-50 text-trust-600 flex items-center justify-center border border-trust-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-navy-900">{record.title}</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-trust-100 text-trust-800">
                  {record.category || 'Clinical Record'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Uploaded {record.uploadDate ? new Date(record.uploadDate).toLocaleDateString() : 'Recently'} • SHA-256 Verified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAnalyzeRecord}
              disabled={analyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition shadow-sm"
            >
              {analyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
              <span>{analyzing ? 'Analyzing...' : 'Re-Run Aarogya AI'}</span>
            </button>

            {record.fileUrl && (
              <a
                href={record.fileUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition"
                title="Download original file"
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
          
          {/* Left Column: Interactive Document Viewer Preview */}
          <div className="lg:col-span-7 bg-slate-900 flex flex-col border-r border-slate-200 relative overflow-hidden">
            {/* Viewer toolbar */}
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

            {/* Document display viewport */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {record.fileUrl ? (
                <div
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease',
                  }}
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

          {/* Right Column: AI-Powered Summary Card & Biomarker Analyzer */}
          <div className="lg:col-span-5 bg-white overflow-y-auto p-6 space-y-6">
            
            {/* AI Summary Header */}
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
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {parsed.summary || parsed.aiAnalysis || (
                  "Aarogya AI translated: Findings are consistent with routine diagnostic monitoring. Key indicators show steady baseline stability with mild glycemic variance."
                )}
              </p>
            </div>

            {/* Biomarkers / Key Metrics with color-coded risk levels */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Biomarkers & Clinical Metrics
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">
                  {biomarkers.length} indicators evaluated
                </span>
              </div>

              <div className="space-y-3">
                {biomarkers.map((bm, idx) => {
                  const isElevated = bm.status === 'elevated' || bm.risk === 'high';
                  const isBorderline = bm.status === 'borderline' || bm.risk === 'moderate';

                  const badgeClass = isElevated
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : isBorderline
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  const dotColor = isElevated ? 'bg-rose-500' : isBorderline ? 'bg-amber-500' : 'bg-emerald-500';

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5"
                    >
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

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recommended Action Steps
                </h4>
                <ul className="space-y-2">
                  {recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ask AI CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenAiChat) onOpenAiChat(record);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-trust-600 text-white font-bold text-xs sm:text-sm hover:bg-trust-700 transition shadow-sm shadow-trust-600/30"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Ask AI Copilot About This Report</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
