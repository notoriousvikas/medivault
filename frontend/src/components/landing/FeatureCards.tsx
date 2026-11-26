import React from 'react';
import {
  ShieldCheck,
  Lock,
  Share2,
  Key,
  Database,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function FeatureCards() {
  return (
    <section id="features" className="py-12 sm:py-20 bg-slate-50/70 border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 space-y-12 sm:space-y-20">

        {/* Section 1: Intro Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-5 sm:p-10 md:p-14 shadow-xl shadow-slate-200/40 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            <div className="lg:col-span-7 space-y-4">
              <span className="inline-block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-trust-600 bg-trust-50 px-3 py-1 rounded-full border border-trust-200/60">
                Next-Gen Healthcare Technology
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-navy-900 tracking-tight leading-tight">
                Decentralized patient privacy meets high-speed clinical intelligence.
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed">
                AyuRaksha replaces fragmented hospital portals with a single patient-owned cryptographic vault. Take your lab results, imaging scans, and prescriptions wherever you go.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <a
                  href="/auth?tab=register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-trust-600 text-white font-semibold text-sm hover:bg-trust-700 active:scale-95 transition shadow-sm"
                >
                  <span>Create Your Free Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center w-full">
              <div className="w-full max-w-sm bg-gradient-to-br from-slate-900 via-navy-900 to-slate-950 text-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400">PATIENT ID HASH</span>
                  <span className="text-[11px] font-mono text-emerald-400">0x7F...9A4B</span>
                </div>
                <div className="space-y-2.5">
                  <div className="p-2.5 sm:p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium">End-to-End Encryption</span>
                    <span className="text-[11px] sm:text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium">PranaSetu Emergency Response</span>
                    <span className="text-[11px] sm:text-xs font-bold text-trust-400 font-mono">&lt; 1.2s</span>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium">Aarogya Diagnostic AI</span>
                    <span className="text-[11px] sm:text-xs font-bold text-amber-400">Clinical Intel</span>
                  </div>
                </div>
                <div className="pt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-trust-400" />
                  <span>Sub-second cryptographic verification</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Section 2: Security Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">

          {/* Security Visual Card (Left on desktop, bottom on mobile) */}
          <div className="lg:col-span-5 order-2 lg:order-1 flex justify-center w-full">
            <div className="w-full max-w-sm bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-navy-900">Vault Encryption</h3>
                    <p className="text-[10px] text-slate-400">AES-256 Client-Side Protocol</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                  ENCLAVE
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                  <Key className="w-4 h-4 text-trust-600 shrink-0" />
                  <div className="text-xs truncate">
                    <div className="font-bold text-slate-800">Master Secret Key</div>
                    <div className="text-[10px] text-slate-500">Stored on your device only</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                  <Database className="w-4 h-4 text-purple-600 shrink-0" />
                  <div className="text-xs truncate">
                    <div className="font-bold text-slate-800">Zero Plaintext Storage</div>
                    <div className="text-[10px] text-slate-500">Decentralized IPFS &amp; Encrypted DB</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                  <Share2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-xs truncate">
                    <div className="font-bold text-slate-800">Time-Bound Doctor PIN</div>
                    <div className="text-[10px] text-slate-500">Auto-revoked after 1 hour</div>
                  </div>
                </div>
              </div>

              <div className="pt-1 text-center">
                <span className="text-[11px] font-mono text-slate-400">
                  SHA-256 Digest: e3b0c44298fc1c149afb...
                </span>
              </div>
            </div>
          </div>

          {/* Security Text Content (Right on desktop, top on mobile) */}
          <div className="lg:col-span-7 order-1 lg:order-2 space-y-4 sm:space-y-6">
            <span className="inline-block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              SMARTSAVE &amp; ENCRYPTION
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-navy-900 tracking-tight leading-tight">
              All your health records are safe with us.
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed">
              We take your medical data security seriously. That is why AyuRaksha employs military-grade client-side encryption protocols before documents ever reach cloud storage. Only you and doctors with your explicit cryptographic authorization can view your files.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <Lock className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">Zero-Knowledge Storage</h4>
                <p className="text-[11px] sm:text-xs text-slate-500">Your master encryption key stays on your device. We cannot view your health data.</p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-trust-600 flex items-center justify-center mb-2">
                  <Share2 className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">Time-Bound Sharing</h4>
                <p className="text-[11px] sm:text-xs text-slate-500">Grant temporary access codes to doctors that expire automatically after consultation.</p>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="/auth?tab=register"
                className="inline-flex items-center justify-center px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-xs sm:text-sm hover:bg-slate-50 transition shadow-xs"
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
