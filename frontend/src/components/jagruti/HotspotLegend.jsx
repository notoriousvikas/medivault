import React from 'react';
import { Info } from 'lucide-react';

const LEGEND_ITEMS = [
  {
    color: 'bg-red-500',
    ring: 'ring-red-200',
    label: 'High Activity',
    desc: 'Elevated cluster of cases',
  },
  {
    color: 'bg-orange-500',
    ring: 'ring-orange-200',
    label: 'Moderate Activity',
    desc: 'Notable regional activity',
  },
  {
    color: 'bg-yellow-400',
    ring: 'ring-yellow-200',
    label: 'Low Activity',
    desc: 'Above privacy threshold (k≥5)',
  },
  {
    color: 'bg-slate-400',
    ring: 'ring-slate-200',
    label: 'Insufficient Data',
    desc: 'Not classified as disease-free',
  },
];

export default function HotspotLegend({ compact = false }) {
  return (
    <div
      className={`bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-soft-md ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-extrabold text-navy-900 uppercase tracking-wider">
          Activity Legend
        </span>
        <span className="text-[10px] font-semibold text-slate-400">H3 Aggregated</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-start gap-2">
            <span
              className={`w-3 h-3 rounded-full ${item.color} ring-2 ${item.ring} shrink-0 mt-0.5`}
            />
            <div className="leading-tight">
              <div className="text-[11px] font-bold text-slate-800">{item.label}</div>
              {!compact && <div className="text-[10px] text-slate-500">{item.desc}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-start gap-1.5 text-[10px] text-slate-500">
        <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
        <span>
          Grey or unshaded areas indicate insufficient reports, not absence of disease.
        </span>
      </div>
    </div>
  );
}
