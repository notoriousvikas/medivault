import React from 'react';
import { ShieldCheck, Lock, Activity, QrCode, FileText, Cpu, Eye, Share2, Zap } from 'lucide-react';
import ThreeDVisualGraphic from './3DVisualGraphic';

export default function FeatureCards() {
  return (
    <section id="features" className="py-20 bg-slate-50/70 border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">

        {/* Section 1: Intro Card matching Image 2 ("Introducing good solution") */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-14 shadow-xl shadow-slate-200/40 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-trust-600 bg-trust-50 px-3 py-1 rounded-full border border-trust-200/60">
                Next-Gen Healthcare Technology
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight">
                Decentralized patient privacy meets high-speed clinical intelligence.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                AyuRaksha replaces fragmented hospital portals with a single patient-owned cryptographic vault. Take your lab results, imaging scans, and prescriptions wherever you go.
              </p>
              <div className="pt-2">
                <a
                  href="/auth?tab=register"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-trust-600 text-white font-semibold text-sm hover:bg-trust-700 transition shadow-sm"
                >
                  Create Your Free Vault
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm bg-gradient-to-br from-slate-900 to-navy-900 text-white p-6 rounded-3xl shadow-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-400">PATIENT ID HASH</span>
                  <span className="text-xs font-mono text-emerald-400">0x7F...9A4B</span>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
                    <span className="text-sm font-medium">End-to-End Encryption</span>
                    <span className="text-xs font-bold text-emerald-400">Verified</span>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
                    <span className="text-sm font-medium">PranaSetu Emergency Response</span>
                    <span className="text-xs font-bold text-trust-400">&lt; 1.2s</span>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
                    <span className="text-sm font-medium">Aarogya Diagnostic AI</span>
                    <span className="text-xs font-bold text-amber-400">Clinical Intelligence</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Security Showcase matching Image 3 ("All your work is safe with us") */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 order-2 lg:order-1 flex justify-center">
            <ThreeDVisualGraphic />
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2 space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              SMARTSAVE & ENCRYPTION
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight">
              All your health records are safe with us.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              We take your medical data security seriously. That is why AyuRaksha employs military-grade client-side encryption protocols before documents ever reach cloud storage. Only you and doctors with your explicit cryptographic authorization can view your files.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <Lock className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Zero-Knowledge Storage</h4>
                <p className="text-xs text-slate-500">Your master encryption key stays on your device. We cannot view your health data.</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-trust-600 flex items-center justify-center mb-2">
                  <Share2 className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Time-Bound Sharing</h4>
                <p className="text-xs text-slate-500">Grant temporary access codes to doctors that expire automatically after consultation.</p>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="/auth?tab=register"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-sm hover:bg-slate-50 transition shadow-sm"
              >
                Learn More About Security
              </a>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
