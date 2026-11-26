import React from 'react';
import { FileText, Pill, QrCode, ShieldCheck } from 'lucide-react';

interface OverviewStatsProps {
  recordsCount?: number;
  prescriptionsCount?: number;
  emergencyScansCount?: number;
  lastSync?: string | Date | null;
}

export default function OverviewStats({
  recordsCount = 0,
  prescriptionsCount = 0,
  emergencyScansCount = 0,
  lastSync = null,
}: OverviewStatsProps) {
  const stats = [
    {
      title: 'Total Medical Records',
      value: recordsCount,
      subtitle: '100% Encrypted & Verified',
      icon: <FileText className="w-5 h-5 text-trust-600" />,
      bg: 'bg-trust-50',
      border: 'border-trust-100',
    },
    {
      title: 'Active Prescriptions',
      value: prescriptionsCount,
      subtitle: 'Synced with Clinical Pharmacy',
      icon: <Pill className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      title: 'PranaSetu Scans',
      value: emergencyScansCount,
      subtitle: 'First Responder Life-Line',
      icon: <QrCode className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      title: 'Vault Security Status',
      value: 'Protected',
      subtitle: lastSync ? `Last synced ${new Date(lastSync).toLocaleDateString()}` : 'Encrypted & Secure',
      icon: <ShieldCheck className="w-5 h-5 text-indigo-600" />,
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, idx) => (
        <div
          key={idx}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.title}</span>
            <div className={`w-9 h-9 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center`}>
              {s.icon}
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-navy-900 tracking-tight">{s.value}</span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{s.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
