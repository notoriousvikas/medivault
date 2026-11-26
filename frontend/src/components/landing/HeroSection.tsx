import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import ThreeDVisualGraphic from './3DVisualGraphic';

export default function HeroSection() {
  return (
    <section className="relative pt-4 sm:pt-6 pb-12 sm:pb-20 overflow-hidden">
      {/* Background ambient mesh */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-100/40 via-transparent to-transparent pointer-events-none rounded-b-[4rem]"
      />

      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 relative">
        <div className="bg-white/95 border border-slate-200/90 rounded-2xl sm:rounded-3xl md:rounded-4xl shadow-xl shadow-slate-200/50 p-4 sm:p-8 md:p-12 lg:p-14 backdrop-blur-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">

            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-left">

              {/* Trust Badge pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200 text-slate-700 tracking-wide max-w-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="uppercase text-[10px] sm:text-[11px] font-bold text-slate-600 truncate">
                  HIPAA Compliant &amp; Decentralized EHR
                </span>
              </div>

              {/* Responsive Bold Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-navy-900 leading-[1.15]">
                The most secure way to control your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-trust-600 via-indigo-600 to-purple-600">
                  health records.
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl">
                Store clinical reports with zero-knowledge encryption, generate emergency QR codes for first responders, and seamlessly connect doctors and patients through our intelligent <strong>AyuRaksha AI</strong> neural bridge.
              </p>

              {/* CTA Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <Link
                  to="/auth?tab=register"
                  className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-trust-600 text-white font-bold text-sm sm:text-base hover:bg-trust-700 active:scale-95 transition-all shadow-lg shadow-trust-600/30 group"
                >
                  <span>Access Vault</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/shared-portal"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold text-sm sm:text-base hover:bg-slate-50 active:scale-95 transition-all shadow-xs"
                >
                  <span>Doctor Portal</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <a
                  href="#workflow"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl sm:rounded-2xl text-slate-600 hover:text-navy-900 font-semibold text-xs sm:text-sm hover:bg-slate-100 transition-colors"
                >
                  <span>How It Works</span>
                </a>
              </div>

              {/* Highlights below buttons */}
              <div className="pt-3 sm:pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Zero-knowledge client keys</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Instant First-Responder QR</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>AyuRaksha AI Medical Intelligence</span>
                </div>
              </div>
            </div>

            {/* Right Visual Graphic (Doctor & Patient connecting hands with AyuRaksha AI in between) */}
            <div className="lg:col-span-5 flex justify-center w-full">
              <ThreeDVisualGraphic />
            </div>

          </div>

          {/* Social Proof / Security Badges Bar */}
          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 text-center md:text-left">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
              Trusted by patients, clinics, and emergency personnel
            </span>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 text-slate-400 font-bold text-xs sm:text-sm">
              <span className="hover:text-slate-600 transition-colors">HIPAA Ready</span>
              <span className="hover:text-slate-600 transition-colors">HL7 FHIR v4</span>
              <span className="hover:text-slate-600 transition-colors">End-to-End Privacy</span>
              <span className="hover:text-slate-600 transition-colors">Aarogya AI Engine</span>
              <span className="hover:text-slate-600 transition-colors">256-Bit Encrypted</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
