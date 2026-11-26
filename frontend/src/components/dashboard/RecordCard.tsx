import React, { useState } from 'react';
import { FileText, Activity, Pill, Download, Trash2, Sparkles, Lock, RefreshCw } from 'lucide-react';
import { recordsApi } from '../../api/records';
import { useToast } from '../../context/ToastContext';
import { MedicalRecord } from '../../types';

interface RecordCardProps {
  record: MedicalRecord;
  onView: (record: MedicalRecord) => void;
  onDeleted?: (id: string) => void;
  onAnalyzed?: (record: MedicalRecord) => void;
}

export default function RecordCard({ record, onView, onDeleted, onAnalyzed }: RecordCardProps) {
  const toast = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getCategoryConfig = (cat?: string) => {
    switch (cat) {
      case 'Lab Report':
        return { icon: <Activity className="w-4 h-4 text-trust-600" />, badge: 'bg-blue-50 text-trust-700 border-blue-200' };
      case 'Prescription':
        return { icon: <Pill className="w-4 h-4 text-emerald-600" />, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'Scan':
        return { icon: <FileText className="w-4 h-4 text-purple-600" />, badge: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { icon: <FileText className="w-4 h-4 text-slate-600" />, badge: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const recordId = record?._id || record?.id || record?.recordId || record?.data?._id;
    if (!recordId) {
      toast.error('AI Analysis Error', 'Missing record identifier.');
      return;
    }
    setAnalyzing(true);
    try {
      const res = await recordsApi.analyzeRecord(recordId);
      toast.success('AI Analysis Completed', 'Aarogya AI clinical summary and biomarkers extracted.');
      const updated = res?.data?.record || res?.data || { ...record, _id: recordId };
      if (onAnalyzed) onAnalyzed(updated);
    } catch (err: any) {
      toast.error('AI Analysis Error', err.message || 'Could not analyze document with Aarogya AI.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const recordId = record?._id || record?.id || record?.recordId || record?.data?._id;
    if (!recordId) return;
    if (!window.confirm(`Permanently delete "${record.title}" from your vault?`)) return;

    setDeleting(true);
    try {
      await recordsApi.deleteRecord(recordId);
      toast.info('Record Removed', `"${record.title}" was removed from the vault.`);
      if (onDeleted) onDeleted(recordId);
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const config = getCategoryConfig(record.category);
  const hasAiSummary = Boolean(record.parsedData?.aiAnalysis || record.parsedData?.summary);
  const triageLevel = record.parsedData?.triage?.level;

  return (
    <div
      onClick={() => onView(record)}
      className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${config.badge}`}>
            {config.icon}
            <span>{record.category || 'Medical Record'}</span>
          </span>

          <div className="flex items-center gap-1.5">
            {triageLevel && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                triageLevel === 'CRITICAL'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : triageLevel === 'URGENT'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                <span>{triageLevel}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>Encrypted</span>
            </span>

            {hasAiSummary && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>AI Parsed</span>
              </span>
            )}
          </div>
        </div>

        <h4 className="font-extrabold text-base text-navy-900 group-hover:text-trust-600 transition-colors line-clamp-1">
          {record.title}
        </h4>

        <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {record.parsedData?.summary ||
            record.parsedData?.aiAnalysis ||
            'Encrypted document stored safely in AyuRaksha. Click to decrypt and view clinical biomarkers.'}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span>
          {record.uploadDate
            ? new Date(record.uploadDate).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : 'Recently added'}
        </span>

        <div className="flex items-center gap-1">
          {!hasAiSummary && (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing}
              title="Run Aarogya AI Clinical Analysis"
              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
            >
              {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </button>
          )}

          {record.fileUrl && (
            <a
              href={record.fileUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Download Document"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            title="Delete Record"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
