import React from 'react';
import { Filter } from 'lucide-react';

export const DISEASE_OPTIONS = [
  { value: 'all', label: 'All Diseases & Symptoms' },
  { value: 'Dengue', label: 'Dengue' },
  { value: 'Fever', label: 'Fever' },
  { value: 'Respiratory / Cough', label: 'Respiratory / Cough' },
  { value: 'Gastrointestinal', label: 'Gastrointestinal' },
  { value: 'Malaria', label: 'Malaria' },
  { value: 'Skin Rash / Lesions', label: 'Skin Rash / Lesions' },
  { value: 'Headache', label: 'Headache' },
  { value: 'Body Pain / Fatigue', label: 'Body Pain / Fatigue' },
  { value: 'Chills & Sweats', label: 'Chills & Sweats' },
];

interface DiseaseFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function DiseaseFilter({ value, onChange, className = '' }: DiseaseFilterProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
      <select
        aria-label="Filter by disease"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-trust-500 transition cursor-pointer"
      >
        {DISEASE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
