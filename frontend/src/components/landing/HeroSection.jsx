import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Lock, Activity, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import ThreeDVisualGraphic from './3DVisualGraphic';

export default function HeroSection() {
  return (
    <section className="relative pt-6 pb-20 overflow-hidden">
      {/* Background ambient mesh */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-100/40 via-transparent to-transparent pointer-events-none rounded-b-[4rem]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="bg-white/90 border border-slate-200/80 rounded-3xl sm:rounded-4xl shadow-xl shadow-slate-200/50 p-6 sm:p-12 lg:p-16 backdrop-blur-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Trust Badge pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="uppercase text-[11px] font-bold text-slate-600">HIPAA Compliant & Decentralized EHR</span>
              </div>

              {/* Bold Headline inspired by template */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-navy-900 leading-[1.12]">
                The most secure way to control your <span className="text-transparent bg-clip-text bg-gradient-to-r from-trust-600 to-indigo-600">health records.</span>
              </h1>

              {/* Subheading */}
              <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl">
                Store medical reports with end-to-end encryption, generate life-saving emergency QR codes for first responders, and translate complex clinical jargon into plain language with Aarogya AI.
              </p>

              {/* CTA Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  to="/auth?tab=register"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-trust-600 text-white font-bold text-base hover:bg-trust-700 active:scale-95 transition-all shadow-lg shadow-trust-600/30 group"
                >
                  <span>Access Vault</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/shared-portal"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold text-base hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                >
                  <span>See How It Works</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </div>

              {/* Highlights below buttons */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Zero-knowledge client keys</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Instant First-Responder QR</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Aarogya AI Medical Intelligence</span>
                </div>
              </div>
            </div>

            {/* Right 3D Visual Graphic (Matching the user-provided inspiration images) */}
            <div className="lg:col-span-5 flex justify-center">
              <ThreeDVisualGraphic />
            </div>

          </div>

          {/* Social Proof Bar matching template footer */}
          <div className="mt-14 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Trusted by patients, clinics, and emergency personnel
            </span>
            <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400 font-bold text-sm">
              <span className="hover:text-slate-600 transition-colors">HIPAA Ready</span>
              <span className="hover:text-slate-600 transition-colors">HL7 FHIR v4</span>
              <span className="hover:text-slate-600 transition-colors">End-to-End Privacy</span>
              <span className="hover:text-slate-600 transition-colors">Aarogya AI Engine</span>
              <span className="hover:text-slate-600 transition-colors">Encrypted Vault</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
