import React from 'react';
import { Activity, Pill, QrCode, FileText, Calendar, CheckCircle2 } from 'lucide-react';

export default function MedicalTimeline({ events = [], onEventClick }) {
  if (events.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 space-y-2">
        <Calendar className="w-8 h-8 mx-auto text-slate-300" />
        <p className="text-sm font-medium text-slate-600">No timeline events recorded yet</p>
        <p className="text-xs text-slate-400">Timeline events are automatically generated as you upload records and sync prescriptions.</p>
      </div>
    );
  }

  const getEventIcon = (category) => {
    switch (category) {
      case 'Lab':
        return <Activity className="w-4 h-4 text-trust-600" />;
      case 'Prescription':
        return <Pill className="w-4 h-4 text-emerald-600" />;
      case 'Emergency':
        return <QrCode className="w-4 h-4 text-rose-600" />;
      default:
        return <FileText className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
      {events.map((ev) => (
        <div key={ev._id} className="relative flex items-start gap-4 group">
          {/* Dot Icon */}
          <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-trust-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <span className="w-1.5 h-1.5 rounded-full bg-trust-600" />
          </div>

          <div
            onClick={() => onEventClick && ev.relatedRecordId && onEventClick(ev.relatedRecordId)}
            className={`flex-1 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm transition ${
              ev.relatedRecordId ? 'cursor-pointer hover:shadow-md hover:border-trust-300' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-trust-700 bg-trust-50 px-2 py-0.5 rounded-md border border-trust-100">
                {ev.category || ev.eventType || 'Clinical Event'}
              </span>
              <span className="text-xs text-slate-400">
                {ev.date || ev.eventDate ? new Date(ev.date || ev.eventDate).toLocaleDateString() : 'Recent'}
              </span>
            </div>

            <h4 className="font-bold text-sm text-navy-900 mt-1.5">{ev.title}</h4>
            {ev.description && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{ev.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
