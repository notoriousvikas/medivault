import React from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  Cpu,
  QrCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileCheck
} from 'lucide-react';

export default function WorkflowSection() {
  return (
    <section id="workflow" className="py-12 sm:py-20 bg-white border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        
        {/* Main Card Container */}
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-10 md:p-14 shadow-xl shadow-slate-200/50">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Side: Headline & CTA */}
            <div className="lg:col-span-5 space-y-4 sm:space-y-6">
              <span className="inline-block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-trust-600 bg-trust-50 px-3 py-1 rounded-full border border-trust-200/60">
                Simple 3-Step Setup
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-navy-900 tracking-tight leading-tight">
                How to join our decentralized care ecosystem.
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed">
                Just 3 straightforward steps to secure your medical history, protect emergency vitals, and connect with physicians through AyuRaksha AI.
              </p>
              <div>
                <Link
                  to="/auth?tab=register"
                  className="inline-flex items-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-trust-600 text-white font-bold text-xs sm:text-sm hover:bg-trust-700 active:scale-95 transition-all shadow-md shadow-trust-600/30"
                >
                  <span>Sign up now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Minimalist Visual badge */}
              <div className="hidden sm:flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                <div className="w-8 h-8 rounded-xl bg-trust-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-navy-900">Patient-Centric Interoperability:</span>
                  <p className="text-[11px] text-slate-500">Fully compatible with ABDM, HL7 FHIR, and decentralized DIDs.</p>
                </div>
              </div>
            </div>

            {/* Right Side: Step 1, Step 2, Step 3 with dividers */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8 divide-y divide-slate-100">
              
              {/* Step 1 */}
              <div className="space-y-2.5 pt-4 sm:pt-6 first:pt-0">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-trust-50 text-trust-600 font-extrabold text-xs sm:text-sm flex items-center justify-center border border-trust-100 shrink-0">
                    1
                  </span>
                  <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-navy-900">
                    Upload or Connect Clinical Records
                  </h3>
                </div>
                <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed pl-11 sm:pl-12">
                  Drag and drop lab reports, diagnostic imaging, or prescriptions. Files are encrypted with SHA-256 and client-side AES keys before safe storage.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-2.5 pt-4 sm:pt-6">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-50 text-purple-600 font-extrabold text-xs sm:text-sm flex items-center justify-center border border-purple-100 shrink-0">
                    2
                  </span>
                  <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-navy-900">
                    AyuRaksha AI Biomarker Extraction &amp; Triage
                  </h3>
                </div>
                <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed pl-11 sm:pl-12">
                  Our integrated clinical AI model extracts critical biomarkers, highlights elevated risk values, and translates complex medical jargon into clear, patient-friendly language.
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-2.5 pt-4 sm:pt-6">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 text-emerald-600 font-extrabold text-xs sm:text-sm flex items-center justify-center border border-emerald-100 shrink-0">
                    3
                  </span>
                  <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-navy-900">
                    Instant Emergency QR &amp; Verified Doctor Portal
                  </h3>
                </div>
                <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed pl-11 sm:pl-12">
                  Print your emergency medical card or share time-bound encrypted access with doctors for seamless teleconsultations and verified electronic prescriptions.
                </p>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
