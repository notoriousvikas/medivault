import React from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, Cpu, QrCode, ArrowRight } from 'lucide-react';
import ThreeDVisualGraphic from './3DVisualGraphic';

export default function WorkflowSection() {
  return (
    <section id="workflow" className="py-20 bg-white border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Card Container matching Image 4 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-14 shadow-xl shadow-slate-200/50">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Side: Headline & CTA */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-trust-600 bg-trust-50 px-3 py-1 rounded-full border border-trust-200/60">
                Simple 3-Step Setup
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight leading-tight">
                How to join our community.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Just 3 simple steps to secure your medical history, protect your emergency vitals, and unlock AI diagnostic intelligence.
              </p>
              <div>
                <Link
                  to="/auth?tab=register"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-trust-600 text-white font-bold text-sm hover:bg-trust-700 active:scale-95 transition-all shadow-md shadow-trust-600/30"
                >
                  <span>Sign up now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Mini Graphic preview */}
              <div className="pt-4 hidden sm:block">
                <ThreeDVisualGraphic />
              </div>
            </div>

            {/* Right Side: Step 1, Step 2, Step 3 with dividers */}
            <div className="lg:col-span-7 space-y-8 divide-y divide-slate-100">
              
              {/* Step 1 */}
              <div className="space-y-3 pt-6 first:pt-0">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-trust-50 text-trust-600 font-extrabold text-sm flex items-center justify-center border border-trust-100">
                    1
                  </span>
                  <h3 className="text-xl font-extrabold text-navy-900">
                    Step 1: Upload or Connect Records
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed pl-11">
                  Drag and drop PDFs, lab reports, imaging scans, or prescriptions. Files are encrypted with SHA-256 and AES client keys before safe storage.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-3 pt-6">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 font-extrabold text-sm flex items-center justify-center border border-emerald-100">
                    2
                  </span>
                  <h3 className="text-xl font-extrabold text-navy-900">
                    Step 2: AI Parsing & Biomarker Extraction
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed pl-11">
                  Our integrated Aarogya Clinical AI model extracts critical biomarkers, highlights elevated risk values, and explains complex clinical terms in clear language.
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-3 pt-6">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 font-extrabold text-sm flex items-center justify-center border border-amber-100">
                    3
                  </span>
                  <h3 className="text-xl font-extrabold text-navy-900">
                    Step 3: Instant PranaSetu QR & Doctor Sharing
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed pl-11">
                  Poof! You are ready. Download your emergency medical card or share a time-bound encrypted PIN with your healthcare provider for seamless clinical review.
                </p>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
