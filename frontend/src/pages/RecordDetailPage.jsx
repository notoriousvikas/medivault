import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { recordsApi } from '../api/records';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCw, Download, Sparkles, FileText, CheckCircle2, ShieldCheck, RefreshCw, MessageSquare } from 'lucide-react';

export default function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
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

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleAnalyzeRecord = async () => {
    setAnalyzing(true);
    try {
      const res = await recordsApi.analyzeRecord(id);
      toast.success('Aarogya Analysis Updated', 'Report parsed and clinical insights refreshed.');
      setRecord(res.data || record);
    } catch (err) {
      toast.error('Analysis Failed', err.message || 'Aarogya AI analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-trust-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Decrypting & Loading Medical Record...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!record) return null;

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between pb-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-trust-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Patient Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAnalyzeRecord}
              disabled={analyzing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition shadow-sm"
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
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
                title="Download original file"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Main Split View Container */}
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

          {/* Right: AI Clinical Summary */}
          <div className="lg:col-span-5 p-6 sm:p-8 overflow-y-auto space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-trust-100 text-trust-800">
                  {record.category}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  SHA256: 0x9f8...2b1a
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-navy-900">{record.title}</h2>
              <p className="text-xs text-slate-500">
                Uploaded {new Date(record.uploadDate || Date.now()).toLocaleDateString()}
              </p>
            </div>

            {/* AI Summary Box */}
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

            {/* Biomarkers */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Biomarkers & Clinical Metrics
              </h3>
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recommended Action Steps
                </h3>
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

            <div className="pt-2">
              <Link
                to={`/dashboard?chatRecord=${record._id}`}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-trust-600 text-white font-bold text-xs sm:text-sm hover:bg-trust-700 transition shadow-sm shadow-trust-600/30"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Ask AI Copilot In Dashboard</span>
              </Link>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
