import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

export default function ThreeDVisualGraphic() {
  return (
    <div className="relative w-full max-w-lg lg:max-w-xl mx-auto flex flex-col items-center justify-center p-2 sm:p-4 select-none">

      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-tr from-trust-500/15 via-purple-500/15 to-emerald-500/15 rounded-full blur-3xl transform scale-110 pointer-events-none"
      />

      {/* Main Visual Stage */}
      <div className="relative w-full min-h-[360px] sm:min-h-[400px] flex items-center justify-center">

        {/* SVG Illustration: 3D Doctor & Patient connecting hands with AyuRaksha AI in between */}
        <svg
          viewBox="0 0 640 380"
          className="w-full h-auto max-h-[400px] drop-shadow-2xl overflow-visible"
        >
          <defs>
            {/* Gradients for Doctor */}
            <linearGradient id="docSkin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FED7AA" />
              <stop offset="100%" stopColor="#FDBA74" />
            </linearGradient>

            <linearGradient id="docHair" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            <linearGradient id="docCoat" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>

            <linearGradient id="docScrubs" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>

            {/* Gradients for Patient */}
            <linearGradient id="patSkin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FED7AA" />
              <stop offset="100%" stopColor="#FB923C" />
            </linearGradient>

            <linearGradient id="patHair" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#92400E" />
              <stop offset="100%" stopColor="#451A03" />
            </linearGradient>

            <linearGradient id="patClothes" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* AI Core Hologram Gradients */}
            <radialGradient id="aiCoreSphere" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="35%" stopColor="#6366F1" />
              <stop offset="75%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </radialGradient>

            <linearGradient id="beamDoc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0.9" />
            </linearGradient>

            <linearGradient id="beamPat" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#34D399" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0.9" />
            </linearGradient>

            {/* Drop Shadows */}
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.15" floodColor="#0F172A" />
            </filter>

            <filter id="aiGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#6366F1" floodOpacity="0.65" />
            </filter>
          </defs>

          {/* 3D Isometric Ground Shadows */}
          <ellipse cx="145" cy="340" rx="85" ry="18" fill="#0F172A" opacity="0.08" />
          <ellipse cx="495" cy="340" rx="85" ry="18" fill="#0F172A" opacity="0.08" />
          <ellipse cx="320" cy="345" rx="100" ry="22" fill="#6366F1" opacity="0.15" />

          {/* ENERGY CONNECTION STREAM BETWEEN HANDS */}
          {/* Bridge ray from Doctor's hand (x=245) to AI Core (x=320) */}
          <path
            d="M 245 195 Q 280 195 320 195"
            stroke="url(#beamDoc)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />
          <path
            d="M 245 195 Q 280 195 320 195"
            stroke="#93C5FD"
            strokeWidth="2.5"
            strokeDasharray="5 5"
            fill="none"
            className="animate-dash-flow"
          />

          {/* Bridge ray from Patient's hand (x=395) to AI Core (x=320) */}
          <path
            d="M 395 195 Q 360 195 320 195"
            stroke="url(#beamPat)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />
          <path
            d="M 395 195 Q 360 195 320 195"
            stroke="#A7F3D0"
            strokeWidth="2.5"
            strokeDasharray="5 5"
            fill="none"
            className="animate-dash-flow"
          />

          {/* Synaptic particles traveling along the connection */}
          <circle cx="275" cy="195" r="3.5" fill="#BFDBFE" className="animate-pulse" />
          <circle cx="365" cy="195" r="3.5" fill="#A7F3D0" className="animate-pulse" />

          {/* ======================================================== */}
          {/* 1. DOCTOR PERSON (LEFT) */}
          {/* ======================================================== */}
          <g filter="url(#softShadow)">
            {/* Doctor Torso & Lab Coat */}
            <path
              d="M 100 320 L 105 170 Q 110 145 145 145 Q 180 145 185 170 L 190 320 Z"
              fill="url(#docCoat)"
            />

            {/* Inner Scrubs (V-Neck) */}
            <path
              d="M 132 146 L 145 185 L 158 146 Z"
              fill="url(#docScrubs)"
            />

            {/* Coat Lapels & Collar */}
            <path
              d="M 125 145 L 138 220 L 122 220 Z"
              fill="#E2E8F0"
              opacity="0.7"
            />
            <path
              d="M 165 145 L 152 220 L 168 220 Z"
              fill="#CBD5E1"
              opacity="0.7"
            />

            {/* Doctor Left Arm (Resting on side) */}
            <path
              d="M 105 170 Q 90 220 95 270 Q 98 285 105 285 Q 115 285 115 265 L 120 190 Z"
              fill="url(#docCoat)"
            />
            {/* Left Hand */}
            <ellipse cx="102" cy="288" rx="8" ry="10" fill="url(#docSkin)" />

            {/* Stethoscope around neck */}
            <path
              d="M 135 152 C 130 190, 140 215, 145 225 C 150 215, 160 190, 155 152"
              fill="none"
              stroke="#0284C7"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Stethoscope bell chest piece */}
            <circle cx="145" cy="228" r="6" fill="#0284C7" />
            <circle cx="145" cy="228" r="3.5" fill="#E2E8F0" />

            {/* Doctor Neck */}
            <path d="M 137 122 L 153 122 L 153 146 L 137 146 Z" fill="url(#docSkin)" />

            {/* Doctor Head */}
            <ellipse cx="145" cy="98" rx="22" ry="26" fill="url(#docSkin)" />

            {/* Doctor Hair (Professional Styled Cut) */}
            <path
              d="M 123 94 C 122 72, 138 65, 152 65 C 166 65, 170 74, 168 88 C 164 88, 160 84, 154 82 C 146 80, 134 85, 126 94 Z"
              fill="url(#docHair)"
            />

            {/* Facial Features (Friendly Doctor Profile) */}
            <ellipse cx="152" cy="96" rx="2" ry="2.5" fill="#334155" />
            <path d="M 152 108 Q 158 114 163 109" stroke="#9A3412" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            {/* Ear */}
            <ellipse cx="124" cy="100" rx="4" ry="6" fill="#FDBA74" />

            {/* DOCTOR RIGHT ARM (EXTENDED TOWARDS CENTER / CONNECTING) */}
            <path
              d="M 175 165 Q 210 175 235 190 L 232 206 Q 198 192 170 185 Z"
              fill="url(#docCoat)"
            />
            {/* Forearm Cuff */}
            <rect x="230" y="186" width="6" height="18" rx="2" fill="#E2E8F0" transform="rotate(10 230 186)" />
            {/* Doctor Outstretched Hand / Open Palm meeting AI */}
            <g transform="translate(236, 187)">
              <ellipse cx="12" cy="7" rx="10" ry="7" fill="url(#docSkin)" />
              <path
                d="M 16 3 Q 26 2 28 5 Q 25 9 18 8"
                fill="url(#docSkin)"
              />
              <path
                d="M 18 7 Q 27 7 29 10 Q 25 13 18 11"
                fill="url(#docSkin)"
              />
              <path
                d="M 10 3 Q 15 -3 18 0 Q 15 5 11 5"
                fill="url(#docSkin)"
              />
            </g>
          </g>

          {/* ======================================================== */}
          {/* 2. PATIENT PERSON (RIGHT) */}
          {/* ======================================================== */}
          <g filter="url(#softShadow)">
            {/* Patient Torso & Casual Knit Sweater */}
            <path
              d="M 540 320 L 535 170 Q 530 145 495 145 Q 460 145 455 170 L 450 320 Z"
              fill="url(#patClothes)"
            />

            {/* Sweater Collar */}
            <ellipse cx="495" cy="147" rx="16" ry="8" fill="#047857" />
            <ellipse cx="495" cy="146" rx="12" ry="5" fill="#A7F3D0" />

            {/* Patient Right Arm (Resting gently at side) */}
            <path
              d="M 535 170 Q 550 220 545 270 Q 542 285 535 285 Q 525 285 525 265 L 520 190 Z"
              fill="url(#patClothes)"
            />
            {/* Right Hand */}
            <ellipse cx="538" cy="288" rx="8" ry="10" fill="url(#patSkin)" />

            {/* Patient Neck */}
            <path d="M 487 122 L 503 122 L 503 146 L 487 146 Z" fill="url(#patSkin)" />

            {/* Patient Head */}
            <ellipse cx="495" cy="98" rx="22" ry="26" fill="url(#patSkin)" />

            {/* Patient Hair (Natural Warm Style) */}
            <path
              d="M 517 94 C 518 70, 502 64, 488 64 C 474 64, 470 74, 472 88 C 476 88, 480 84, 486 82 C 494 80, 506 85, 514 94 Z"
              fill="url(#patHair)"
            />

            {/* Facial Features */}
            <ellipse cx="488" cy="96" rx="2" ry="2.5" fill="#334155" />
            <path d="M 488 108 Q 482 114 477 109" stroke="#9A3412" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            {/* Ear */}
            <ellipse cx="516" cy="100" rx="4" ry="6" fill="#FB923C" />

            {/* PATIENT LEFT ARM (EXTENDED TOWARDS CENTER / CONNECTING) */}
            <path
              d="M 465 165 Q 430 175 405 190 L 408 206 Q 442 192 470 185 Z"
              fill="url(#patClothes)"
            />
            {/* Smart Health Watch on Wrist */}
            <rect x="402" y="186" width="6" height="18" rx="2" fill="#0284C7" transform="rotate(-10 402 186)" />
            <circle cx="403" cy="195" r="2" fill="#38BDF8" className="animate-pulse" />

            {/* Patient Outstretched Hand / Open Palm meeting AI */}
            <g transform="translate(382, 187)">
              <ellipse cx="10" cy="7" rx="10" ry="7" fill="url(#patSkin)" />
              <path
                d="M 6 3 Q -4 2 -6 5 Q -3 9 4 8"
                fill="url(#patSkin)"
              />
              <path
                d="M 4 7 Q -5 7 -7 10 Q -3 13 4 11"
                fill="url(#patSkin)"
              />
              <path
                d="M 12 3 Q 7 -3 4 0 Q 7 5 11 5"
                fill="url(#patSkin)"
              />
            </g>
          </g>

          {/* ======================================================== */}
          {/* 3. AYURAKSHA AI IN BETWEEN THEIR CONNECTING HANDS */}
          {/* ======================================================== */}
          <g transform="translate(320, 195)">
            <circle cx="0" cy="0" r="42" fill="#6366F1" opacity="0.18" className="animate-pulse" />
            <circle cx="0" cy="0" r="34" fill="#3B82F6" opacity="0.25" />

            <circle
              cx="0"
              cy="0"
              r="30"
              fill="none"
              stroke="#818CF8"
              strokeWidth="2"
              strokeDasharray="6 4"
              className="animate-rotate-slow"
              opacity="0.8"
            />

            <circle
              cx="0"
              cy="0"
              r="24"
              fill="none"
              stroke="#34D399"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="animate-spin-reverse"
              opacity="0.8"
            />

            <circle cx="0" cy="0" r="18" fill="url(#aiCoreSphere)" filter="url(#aiGlowFilter)" />

            <path
              d="M 0 -8 L 6 -5 L 6 1 C 6 6 0 9 0 9 C 0 9 -6 6 -6 1 L -6 -5 Z"
              fill="#FFFFFF"
              opacity="0.95"
            />
            <circle cx="0" cy="0" r="2" fill="#38BDF8" />

            <circle cx="-28" cy="0" r="2" fill="#93C5FD" className="animate-ping" />
            <circle cx="28" cy="0" r="2" fill="#A7F3D0" className="animate-ping" />
          </g>

          {/* ======================================================== */}
          {/* 4. OVERLAY BADGES (DOCTOR, PATIENT, AI) */}
          {/* ======================================================== */}

          {/* Floating Pill: Doctor */}
          <g transform="translate(70, 24)">
            <rect x="0" y="0" width="150" height="34" rx="12" fill="#FFFFFF" stroke="#DBEAFE" strokeWidth="1.5" filter="url(#softShadow)" />
            <circle cx="20" cy="17" r="10" fill="#2563EB" />
            <path d="M 17 14 C 17 18 23 18 23 14" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
            <circle cx="20" cy="20" r="1.5" fill="#FFFFFF" />
            <text x="36" y="16" fontFamily="sans-serif" fontSize="11" fontWeight="800" fill="#0F172A">Dr. Anmol Singh</text>
            <text x="36" y="27" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#2563EB">Verified Physician</text>
          </g>

          {/* Floating Pill: Patient */}
          <g transform="translate(420, 24)">
            <rect x="0" y="0" width="150" height="34" rx="12" fill="#FFFFFF" stroke="#D1FAE5" strokeWidth="1.5" filter="url(#softShadow)" />
            <circle cx="20" cy="17" r="10" fill="#059669" />
            <circle cx="20" cy="14" r="3.5" fill="#FFFFFF" />
            <path d="M 15 22 C 15 19 25 19 25 22" fill="#FFFFFF" />
            <text x="36" y="16" fontFamily="sans-serif" fontSize="11" fontWeight="800" fill="#0F172A">Alex Morgan</text>
            <text x="36" y="27" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#059669">Patient Vault Owner</text>
          </g>

          {/* Floating Badge below hands: AyuRaksha AI Bridge */}
          <g transform="translate(230, 275)">
            <rect x="0" y="0" width="180" height="38" rx="14" fill="#0F172A" stroke="#334155" strokeWidth="1.5" filter="url(#softShadow)" />
            <circle cx="22" cy="19" r="10" fill="#6366F1" />
            <path d="M 22 13 L 26 15 L 26 19 C 26 22 22 24 22 24 C 22 24 18 22 18 19 L 18 15 Z" fill="#FFFFFF" opacity="0.9" />
            <text x="38" y="17" fontFamily="sans-serif" fontSize="11" fontWeight="900" fill="#FFFFFF">AyuRaksha AI</text>
            <text x="38" y="29" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#93C5FD">Connecting Care &amp; Privacy</text>
          </g>

        </svg>

        {/* Responsive Telemetry Status Bar below graphic */}
        <div className="absolute -bottom-2 sm:bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm flex items-center justify-between px-3.5 py-1.5 rounded-full bg-white/95 border border-slate-200/90 shadow-md backdrop-blur-md text-[10px] sm:text-[11px] text-slate-600 font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Encrypted Bridge</span>
          </div>
          <span className="text-slate-300">&bull;</span>
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3 text-rose-500" />
            <span>Vitals: 72 bpm</span>
          </div>
          <span className="text-slate-300">&bull;</span>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-trust-600" />
            <span>Zero-Knowledge</span>
          </div>
        </div>

      </div>

    </div>
  );
}
