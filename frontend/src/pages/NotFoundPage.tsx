import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-trust-50 text-trust-600 flex items-center justify-center mb-4 border border-trust-100">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-navy-900 tracking-tight">404</h1>
      <h2 className="text-lg font-bold text-slate-700 mt-1">Page Not Found</h2>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-2 leading-relaxed">
        The requested medical route or record cannot be located in the vault.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-trust-600 text-white font-bold text-xs sm:text-sm hover:bg-trust-700 transition shadow-sm"
        >
          <Home className="w-4 h-4" />
          <span>Go to Home</span>
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition"
        >
          <span>Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
