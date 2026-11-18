import React from 'react';
import { ShieldCheck, Lock, Activity, QrCode, FileText } from 'lucide-react';

export default function ThreeDVisualGraphic() {
  return (
    <div className="relative w-full max-w-lg mx-auto flex items-center justify-center p-6 select-none">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-emerald-500/10 to-indigo-500/10 rounded-full blur-3xl transform scale-110 pointer-events-none" />

      {/* Isometric 3D Cylinder & Medical Capsule Composition */}
      <div className="relative w-full h-[400px] flex items-center justify-center">
        {/* Floating Medical Card / Device (Inspired by the template phone screen) */}
        <div className="absolute z-30 top-4 -right-2 sm:right-6 w-48 sm:w-56 bg-navy-900/95 border border-slate-700/80 shadow-2xl rounded-2xl p-4 text-white backdrop-blur-xl transform -rotate-3 hover:rotate-0 transition-transform duration-500">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Vault Secured</span>
            </div>
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
          </div>

          <div className="mt-3 space-y-2">
            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/50 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="text-xs truncate">
                <div className="font-semibold text-white">Metabolic Panel</div>
                <div className="text-[10px] text-emerald-400 font-medium">AI Verified • Normal</div>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/50 flex items-center justify-between">
              <div className="text-[11px] text-slate-300">Emergency Token</div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE QR
              </span>
            </div>
          </div>
        </div>

        {/* 3D Geometric Cylinders Group (matching the template's iconic look) */}
        <svg viewBox="0 0 500 440" className="w-full h-full drop-shadow-2xl">
          <defs>
            {/* Gradients */}
            <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="slateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>
            <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="lightBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>

            {/* Drop shadow */}
            <filter id="cylinderShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="12" stdDeviation="10" floodOpacity="0.18" floodColor="#0F172A" />
            </filter>
          </defs>

          {/* Background Pillars */}
          {/* Amber pillar back-left */}
          <g filter="url(#cylinderShadow)">
            <path d="M 120 180 Q 120 160 145 160 Q 170 160 170 180 L 170 320 Q 170 340 145 340 Q 120 340 120 320 Z" fill="url(#amberGrad)" />
            <ellipse cx="145" cy="180" rx="25" ry="12" fill="#FDE68A" />
          </g>

          {/* Dark Slate pillar back-mid */}
          <g filter="url(#cylinderShadow)">
            <path d="M 180 140 Q 180 120 210 120 Q 240 120 240 140 L 240 330 Q 240 350 210 350 Q 180 350 180 330 Z" fill="url(#slateGrad)" />
            <ellipse cx="210" cy="140" rx="30" ry="14" fill="#64748B" />
          </g>

          {/* Amber pillar back-right */}
          <g filter="url(#cylinderShadow)">
            <path d="M 280 160 Q 280 140 310 140 Q 340 140 340 160 L 340 340 Q 340 360 310 360 Q 280 360 280 340 Z" fill="url(#amberGrad)" />
            <ellipse cx="310" cy="160" rx="30" ry="14" fill="#FDE68A" />
          </g>

          {/* Foreground Tall Blue Pillar (Centerpiece) */}
          <g filter="url(#cylinderShadow)">
            <path d="M 215 110 Q 215 80 250 80 Q 285 80 285 110 L 285 360 Q 285 385 250 385 Q 215 385 215 360 Z" fill="url(#blueGrad)" />
            <ellipse cx="250" cy="110" rx="35" ry="17" fill="#93C5FD" />
          </g>

          {/* Teal Front-Right Pillar */}
          <g filter="url(#cylinderShadow)">
            <path d="M 290 190 Q 290 170 320 170 Q 350 170 350 190 L 350 350 Q 350 370 320 370 Q 290 370 290 350 Z" fill="url(#tealGrad)" />
            <ellipse cx="320" cy="190" rx="30" ry="14" fill="#A7F3D0" />
          </g>

          {/* Vibrant Trust Blue Front-Left Pillar */}
          <g filter="url(#cylinderShadow)">
            <path d="M 150 200 Q 150 175 185 175 Q 220 175 220 200 L 220 360 Q 220 380 185 380 Q 150 380 150 360 Z" fill="url(#lightBlueGrad)" />
            <ellipse cx="185" cy="200" rx="35" ry="16" fill="#BFDBFE" />
          </g>

          {/* Amber Front-Center Accent Cylinder */}
          <g filter="url(#cylinderShadow)">
            <path d="M 220 230 Q 220 205 250 205 Q 280 205 280 230 L 280 370 Q 280 390 250 390 Q 220 390 220 370 Z" fill="url(#amberGrad)" />
            <ellipse cx="250" cy="230" rx="30" ry="14" fill="#FEF08A" />
          </g>

          {/* Floating Security Badge Sphere */}
          <circle cx="210" cy="80" r="14" fill="#FBBF24" filter="url(#cylinderShadow)" />
          <circle cx="206" cy="76" r="4" fill="#FEF08A" />
        </svg>

        {/* Floating Quick Action Pill */}
        <div className="absolute z-30 bottom-4 -left-2 sm:left-4 bg-white/95 border border-slate-200/80 shadow-xl rounded-2xl p-3 flex items-center gap-3 backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Decentralized EHR</div>
            <div className="text-[11px] text-slate-500">256-bit AES Zero-Knowledge</div>
          </div>
        </div>
      </div>
    </div>
  );
}
