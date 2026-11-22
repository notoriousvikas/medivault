import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  User,
  LogOut,
  Menu,
  X,
  QrCode,
  Activity,
  Lock,
  ArrowRight,
  UserPen,
  ChevronDown,
  LayoutDashboard,
  Settings,
  MessageSquare,
  Stethoscope,
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarRef = useRef(null);

  const homeDestination = isAuthenticated
    ? user?.role === 'admin'
      ? '/admin'
      : '/dashboard'
    : '/';

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const roleColor = user?.role === 'admin'
    ? 'bg-purple-100 text-purple-800'
    : user?.role === 'doctor'
    ? 'bg-teal-100 text-teal-800'
    : 'bg-trust-100 text-trust-800';

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to={homeDestination} className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-trust-600 to-trust-500 text-white flex items-center justify-center shadow-md shadow-trust-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-navy-900">AyuRaksha</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-md">
                  Life Saver
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Life Saver &bull; AI Medical Triage</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {isAuthenticated ? (
              <>
                <Link
                  to={user?.role === 'admin' ? '/admin' : '/dashboard'}
                  className="text-sm font-semibold text-slate-600 hover:text-trust-600 transition-colors flex items-center gap-1.5"
                >
                  <span>{user?.role === 'admin' ? 'Admin Portal' : 'Dashboard'}</span>
                  {user?.role === 'admin' && (
                    <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-purple-100 text-purple-700 rounded-md">
                      Admin
                    </span>
                  )}
                </Link>
                <Link
                  to="/consultations"
                  className="text-sm font-semibold text-slate-600 hover:text-trust-600 transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4 text-trust-600" />
                  <span>{user?.role === 'doctor' ? 'Patient Consults' : 'Doctor Chat'}</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-trust-100 text-trust-700 rounded-md">
                    Live
                  </span>
                </Link>
                <Link
                  to="/shared-portal"
                  className="text-sm font-semibold text-slate-600 hover:text-trust-600 transition-colors flex items-center gap-1.5"
                >
                  <span>Emergency Portal</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-trust-600" />
                </Link>
              </>
            ) : (
              <>
                <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-trust-600 transition-colors">
                  Overview
                </Link>
                <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-trust-600 transition-colors">
                  Features
                </a>
                <a href="#workflow" className="text-sm font-semibold text-slate-600 hover:text-trust-600 transition-colors">
                  How it works
                </a>
                <Link to="/shared-portal" className="text-sm font-semibold text-slate-600 hover:text-trust-600 transition-colors flex items-center gap-1.5">
                  <span>Doctor Portal</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-trust-600" />
                </Link>
              </>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/shared-portal"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-colors border border-slate-200"
            >
              <QrCode className="w-3.5 h-3.5 text-trust-600" />
              <span>Emergency Scan</span>
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to={user?.role === 'admin' ? '/admin' : '/dashboard'}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-trust-600 text-white font-semibold text-sm hover:bg-trust-700 transition shadow-sm hover:shadow"
                >
                  <Activity className="w-4 h-4" />
                  <span>{user?.role === 'admin' ? 'Admin Portal' : 'My Vault'}</span>
                </Link>

                {/* Avatar dropdown */}
                <div className="relative" ref={avatarRef}>
                  <button
                    onClick={() => setAvatarMenuOpen((v) => !v)}
                    className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 transition focus:outline-none"
                    title="Account menu"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-navy-800 to-trust-600 text-white flex items-center justify-center font-bold text-sm shadow">
                      {initials}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition ${avatarMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {avatarMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50">
                      {/* User info header */}
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                        <p className="text-sm font-bold text-navy-900 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                        <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${roleColor}`}>
                          {user?.role || 'Patient'}
                        </span>
                      </div>

                      {/* Menu items */}
                      <div className="py-1">
                        <Link
                          to={user?.role === 'admin' ? '/admin' : '/dashboard'}
                          onClick={() => setAvatarMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-900 transition"
                        >
                          <LayoutDashboard className="w-4 h-4 text-trust-500" />
                          Dashboard
                        </Link>
                        <Link
                          to="/consultations"
                          onClick={() => setAvatarMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-900 transition"
                        >
                          <MessageSquare className="w-4 h-4 text-trust-600" />
                          {user?.role === 'doctor' ? 'Patient Consultations' : 'Doctor Chat'}
                        </Link>
                        {user?.role !== 'admin' && (
                          <Link
                            to="/dashboard"
                            state={{ openEditProfile: true }}
                            onClick={() => setAvatarMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-900 transition"
                          >
                            <UserPen className="w-4 h-4 text-mint-500" />
                            Edit Health Profile
                          </Link>
                        )}
                        <Link
                          to="/shared-portal"
                          onClick={() => setAvatarMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-900 transition"
                        >
                          <QrCode className="w-4 h-4 text-slate-400" />
                          Doctor Portal
                        </Link>
                      </div>

                      <div className="border-t border-slate-100 py-1">
                        <button
                          onClick={() => { setAvatarMenuOpen(false); handleLogout(); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/auth"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-navy-900 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/auth?tab=register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-trust-600 text-white font-semibold text-sm hover:bg-trust-700 transition shadow-sm shadow-trust-600/30"
                >
                  <span>Access Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3">
          {isAuthenticated ? (
            <>
              <Link
                to={user?.role === 'admin' ? '/admin' : '/dashboard'}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-semibold text-slate-800 hover:bg-slate-50 rounded-lg"
              >
                Dashboard
              </Link>
              <Link
                to="/consultations"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-semibold text-trust-600 hover:bg-slate-50 rounded-lg"
              >
                {user?.role === 'doctor' ? 'Patient Consultations' : 'Doctor Chat'}
              </Link>
              <Link
                to="/shared-portal"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-semibold text-slate-800 hover:bg-slate-50 rounded-lg"
              >
                Emergency Portal
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-semibold text-slate-800 hover:bg-slate-50 rounded-lg"
              >
                Overview
              </Link>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-semibold text-slate-800 hover:bg-slate-50 rounded-lg"
              >
                Features
              </a>
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-semibold text-slate-800 hover:bg-slate-50 rounded-lg"
              >
                How it works
              </a>
              <Link
                to="/shared-portal"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-semibold text-slate-800 hover:bg-slate-50 rounded-lg"
              >
                Doctor & Emergency Portal
              </Link>
            </>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to={user?.role === 'admin' ? '/admin' : '/dashboard'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 rounded-xl bg-trust-600 text-white font-semibold text-sm"
                >
                  {user?.role === 'admin' ? 'Admin Portal' : 'Patient Dashboard'}
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-center px-4 py-2 text-sm text-rose-600 font-semibold"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm"
                >
                  Log In
                </Link>
                <Link
                  to="/auth?tab=register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 rounded-xl bg-trust-600 text-white font-semibold text-sm"
                >
                  Access Vault
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
