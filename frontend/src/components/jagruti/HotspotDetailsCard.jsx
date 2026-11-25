import React from 'react';
import {
  X,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const SEVERITY_BADGE = {
  high: {
    label: 'High',
    classes: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  moderate: {
    label: 'Moderate',
    classes: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
  },
  low: {
    label: 'Low',
    classes: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    dot: 'bg-yellow-400',
  },
  insufficient_data: {
    label: 'Insufficient Data',
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
};

const TREND_META = {
  increasing: {
    label: 'Increasing',
    icon: TrendingUp,
    classes: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  decreasing: {
    label: 'Decreasing',
    icon: TrendingDown,
    classes: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  stable: {
    label: 'Stable',
    icon: Minus,
    classes: 'text-slate-600 bg-slate-100 border-slate-200',
  },
  insufficient_data: {
    label: 'Insufficient Data',
    icon: AlertCircle,
    classes: 'text-slate-500 bg-slate-100 border-slate-200',
  },
};

function formatLastUpdated(dateValue) {
  if (!dateValue) return 'Recently';
  const d = new Date(dateValue);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function HotspotDetailsCard({ hotspot, onClose }) {
  if (!hotspot) return null;

  const sev = SEVERITY_BADGE[hotspot.severity] || SEVERITY_BADGE.insufficient_data;
  const trendInfo = TREND_META[hotspot.trend] || TREND_META.stable;
  const TrendIcon = trendInfo.icon;

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl shadow-soft-xl p-5 flex flex-col gap-4 animate-in fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${sev.classes}`}
            >
              <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
              {sev.label} Activity
            </span>
            {hotspot.isSampleData && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Sample Data
              </span>
            )}
          </div>
          <h4 className="text-base font-black text-navy-900 flex items-center gap-1.5 pt-0.5">
            <MapPin className="w-4 h-4 text-trust-600 shrink-0" />
            <span>{hotspot.approximateAreaName}</span>
          </h4>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close hotspot details"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Disease / Signal
          </span>
          <p className="text-sm font-extrabold text-navy-900 mt-0.5">{hotspot.disease}</p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Reported Cases
          </span>
          <p className="text-sm font-extrabold text-navy-900 mt-0.5">
            {hotspot.caseCountRange}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Trend
          </span>
          <div className="mt-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${trendInfo.classes}`}
            >
              <TrendIcon className="w-3 h-3" />
              {trendInfo.label}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Last Updated
          </span>
          <p className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{formatLastUpdated(hotspot.lastUpdatedAt)}</span>
          </p>
        </div>
      </div>

      {/* Preventive Measures */}
      {Array.isArray(hotspot.preventiveMeasures) && hotspot.preventiveMeasures.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-extrabold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Recommended Preventive Measures</span>
          </h5>
          <ul className="space-y-1.5">
            {hotspot.preventiveMeasures.map((measure, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{measure}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Privacy Disclaimer */}
      <div className="bg-trust-50/70 border border-trust-100 rounded-2xl p-3 text-[11px] text-slate-600 leading-relaxed">
        <strong className="text-trust-800">Privacy Notice:</strong>{' '}
        {hotspot.disclaimer ||
          'Hotspot locations are approximate and represent aggregated health reports. Individual patient locations are never displayed.'}
      </div>
    </div>
  );
}
