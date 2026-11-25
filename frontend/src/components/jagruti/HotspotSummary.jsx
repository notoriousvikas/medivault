import React from 'react';
import { Activity, ShieldAlert, TrendingUp, MapPin } from 'lucide-react';

export default function HotspotSummary({ summary, loading }) {
  const highCount = summary?.severityCounts?.high ?? 0;
  const moderateCount = summary?.severityCounts?.moderate ?? 0;
  const totalHotspots = summary?.totalHotspots ?? 0;
  const monitoredRegions = summary?.monitoredRegionsCount ?? 0;
  const topDiseases = summary?.topDiseases || [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active H3 Zones
            </span>
            <div className="w-8 h-8 rounded-xl bg-trust-50 text-trust-600 flex items-center justify-center border border-trust-100">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-navy-900">
            {loading ? '—' : totalHotspots}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Privacy-filtered cells (k ≥ 5)
          </p>
        </div>

        <div className="bg-white border border-rose-200/80 rounded-3xl p-4 shadow-sm bg-gradient-to-br from-white to-rose-50/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              High Activity
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">
            {loading ? '—' : highCount}
          </div>
          <p className="text-[11px] text-rose-500/80 mt-0.5 font-medium">
            Elevated public vigilance
          </p>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-3xl p-4 shadow-sm bg-gradient-to-br from-white to-amber-50/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Moderate Activity
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">
            {loading ? '—' : moderateCount}
          </div>
          <p className="text-[11px] text-amber-600/80 mt-0.5 font-medium">
            Regional watch zones
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Monitored Regions
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-navy-900">
            {loading ? '—' : monitoredRegions}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Approximate city/district areas
          </p>
        </div>
      </div>

      {topDiseases.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Top Signals:
          </span>
          {topDiseases.map((d) => (
            <span
              key={d.disease}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-sm"
            >
              <span>{d.disease}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                {d.hotspotCount}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
