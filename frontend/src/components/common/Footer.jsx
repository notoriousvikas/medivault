import React from 'react';
import { ShieldCheck, Heart, Lock, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-trust-600 flex items-center justify-center text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">AyuRaksha</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Life Saver</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Secure, decentralized Electronic Health Record (EHR) management with emergency instant-response QR protocols, intelligent radiology triage, and AI medical intelligence.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>HIPAA Compliant • End-to-End Encrypted • Zero-Knowledge</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="/dashboard" className="hover:text-white transition">Patient Dashboard</a></li>
              <li><a href="/shared-portal" className="hover:text-white transition">Doctor Access Portal</a></li>
              <li><a href="/shared-portal" className="hover:text-white transition">Emergency First Responder</a></li>
              <li><a href="/auth" className="hover:text-white transition">Access Vault / Login</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Security & Standards</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><span>End-to-End Privacy Encryption</span></li>
              <li><span>Clinical Healthcare Interoperability</span></li>
              <li><span>Aarogya Clinical AI Intelligence</span></li>
              <li><span>Encrypted Vault Storage</span></li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} AyuRaksha Technologies. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built for modern clinical resilience with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  );
}
