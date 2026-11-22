import React from 'react';
import { Activity, Pill, QrCode, FileText, Calendar, ScanLine, ExternalLink } from 'lucide-react';

export default function MedicalTimeline({ events = [], onEventClick }) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 space-y-2">
        <Calendar className="w-8 h-8 mx-auto text-slate-300" />
        <p className="text-sm font-semibold text-slate-600">No timeline events recorded yet</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Medical records, imaging scans, and prescriptions are automatically tracked here chronologically.
        </p>
      </div>
    );
  }

  const getEventBadge = (category) => {
    const norm = (category || '').toLowerCase();
    if (norm.includes('scan') || norm.includes('xray') || norm.includes('imaging')) {
      return {
        icon: <ScanLine className="w-3.5 h-3.5 text-purple-600" />,
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'border-purple-600 text-purple-600',
      };
    }
    if (norm.includes('lab')) {
      return {
        icon: <Activity className="w-3.5 h-3.5 text-blue-600" />,
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'border-blue-600 text-blue-600',
      };
    }
    if (norm.includes('prescription') || norm.includes('rx')) {
      return {
        icon: <Pill className="w-3.5 h-3.5 text-emerald-600" />,
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'border-emerald-600 text-emerald-600',
      };
    }
    if (norm.includes('emergency')) {
      return {
        icon: <QrCode className="w-3.5 h-3.5 text-rose-600" />,
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'border-rose-600 text-rose-600',
      };
    }
    return {
      icon: <FileText className="w-3.5 h-3.5 text-indigo-600" />,
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dot: 'border-indigo-600 text-indigo-600',
    };
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
      {events.map((ev) => {
        const cat = ev.category || ev.eventType || 'Clinical Event';
        const config = getEventBadge(cat);
        const targetRecordId = ev.relatedRecordId || ev.referenceId;
        const isClickable = Boolean(onEventClick && targetRecordId);

        return (
          <div key={ev._id} className="relative flex items-start gap-4 group">
            {/* Timeline Dot */}
            <div
              className={`absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 ${config.dot} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
            </div>

            {/* Event Card */}
            <div
              onClick={() => isClickable && onEventClick(targetRecordId)}
              className={`flex-1 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm transition ${
                isClickable
                  ? 'cursor-pointer hover:shadow-md hover:border-trust-300'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-lg border ${config.badge}`}
                >
                  {config.icon}
                  <span>{cat}</span>
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {ev.date || ev.eventDate
                    ? new Date(ev.date || ev.eventDate).toLocaleDateString()
                    : 'Recent'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 mt-2">
                <h4 className="font-extrabold text-sm text-navy-900 group-hover:text-trust-600 transition-colors">
                  {ev.title}
                </h4>
                {isClickable && (
                  <span className="text-[10px] font-bold text-trust-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                    <span>View Record</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                )}
              </div>

              {ev.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {ev.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
