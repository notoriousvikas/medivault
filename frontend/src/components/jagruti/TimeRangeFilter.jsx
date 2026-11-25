import React from 'react';
import { Calendar } from 'lucide-react';

const WINDOWS = [
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
];

export default function TimeRangeFilter({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0">
      <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 hidden sm:block" />
      {WINDOWS.map((w) => (
        <button
          key={w.id}
          type="button"
          onClick={() => onChange(w.id)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            value === w.id
              ? 'bg-white text-navy-900 shadow-sm'
              : 'text-slate-500 hover:text-navy-900'
          }`}
        >
          {w.label}
        </button>
      ))}
    </div>
  );
}
