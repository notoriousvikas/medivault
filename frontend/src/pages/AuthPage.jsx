import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  User,
  Stethoscope,
  ArrowRight,
  Wallet,
  Sparkles,
  Eye,
  EyeOff,
  Activity,
  BadgeCheck,
  QrCode,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, register, isAuthenticated, user } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');
  const [role, setRole] = useState(searchParams.get('role') === 'doctor' ? 'doctor' : 'patient');
  const [loading, setLoading] = useState(false);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [specialization, setSpecialization] = useState('General Medicine');
  const [licenseNumber, setLicenseNumber] = useState('');

  // Sync state if search params change
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'register') setMode('register');
    else if (tabParam === 'login') setMode('login');

    const roleParam = searchParams.get('role');
    if (roleParam === 'doctor' || roleParam === 'patient') setRole(roleParam);
  }, [searchParams]);

  // If already logged in, redirect
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        toast.success('Welcome back!', 'Successfully authenticated to your medical vault.');
        if (res?.user?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        // Parse allergies into array
        const allergyList = allergies
          ? allergies.split(',').map((a) => a.trim()).filter(Boolean)
          : [];

        const registerPayload = {
          name,
          email,
          password,
          role,
          age: age ? Number(age) : undefined,
          bloodGroup: role === 'patient' ? bloodGroup : undefined,
          allergies: role === 'patient' ? allergyList : [],
          specialization: role === 'doctor' ? specialization : undefined,
          licenseNumber: role === 'doctor' ? licenseNumber : undefined,
        };

        const res = await register(registerPayload);
        toast.success('Account Created', 'Your decentralized medical vault has been provisioned.');
        if (res?.user?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      toast.error('Authentication Error', err.message || 'Failed to authenticate. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-Click Demo Credential fill
  const handleQuickDemo = (demoRole) => {
    if (demoRole === 'patient') {
      setEmail('vikaskbaboria@gmail.com');
      setPassword('Password123!');
      setRole('patient');
      setMode('login');
      toast.info('Demo Credentials Loaded', 'Patient credentials auto-filled. Click "Sign In" or submit.');
    } else if (demoRole === 'doctor') {
      setEmail('vikasbaboria12@gmail.com');
      setPassword('Password123!');
      setRole('doctor');
      setMode('login');
      toast.info('Demo Credentials Loaded', 'Doctor credentials auto-filled (Dr. Anmol Singh). Click "Sign In" to open Doctor Portal.');
    } else if (demoRole === 'admin') {
      setEmail('admin@ayuraksha.io');
      setPassword('Password123!');
      setRole('admin');
      setMode('login');
      toast.info('Demo Credentials Loaded', 'Admin credentials auto-filled. Click "Sign In" to open Admin Portal.');
    }
  };

  // Web3 / Decentralized Wallet Sign-in Simulation
  const handleWalletConnect = async () => {
    setWalletConnecting(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
      // Prefill with decentralized identity
      setEmail('web3.patient@medivault.eth');
      setPassword('WalletSign-2026-Auth!');
      setMode('login');
      toast.info('Wallet Connected', 'Ethereum address verified: 0x71C...9B42. Ready to authenticate.');
    } catch (err) {
      toast.error('Wallet Error', 'Failed to connect decentralized provider.');
    } finally {
      setWalletConnecting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-between relative overflow-x-hidden">
      {/* Decorative background glows */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -top-40 -right-40 w-80 sm:w-96 h-80 sm:h-96 bg-trust-200/40 rounded-full blur-3xl opacity-60" 
      />
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -bottom-40 -left-40 w-80 sm:w-96 h-80 sm:h-96 bg-emerald-200/30 rounded-full blur-3xl opacity-50" 
      />

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 flex-1 flex flex-col justify-center">
        
        {/* Back Link */}
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-5xl mx-auto mb-4 sm:mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-trust-600 transition group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Responsive Grid: Single centered column on mobile/tablet, 2-column split on desktop (lg+) */}
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-5xl mx-auto lg:grid lg:grid-cols-12 lg:gap-10 xl:gap-14 lg:items-center">
          
          {/* Desktop Left Showcase Panel (visible on lg: >= 1024px) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-8 pr-2">
            <div>
              <Link to="/" className="inline-flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-trust-600 text-white flex items-center justify-center shadow-lg shadow-trust-600/30">
                  <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-2xl font-extrabold text-navy-900 tracking-tight">AyuRaksha</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600">Life Saver</span>
                </div>
              </Link>
              <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight leading-tight">
                Decentralized Health Records &amp; Emergency Intelligence
              </h1>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Empowering patients and doctors with end-to-end encrypted clinical histories, instant QR triage, and blockchain-verified consultations.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-4">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-xs backdrop-blur-sm">
                <div className="w-9 h-9 rounded-xl bg-trust-50 text-trust-600 flex items-center justify-center shrink-0 mt-0.5 border border-trust-100">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-navy-900">Zero-Knowledge Encryption</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                    Clinical data encrypted with AES-256-GCM. Only authorized keys can decrypt your records.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-xs backdrop-blur-sm">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-navy-900">Life-Saving Emergency QR</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                    Paramedics scan your dynamic QR badge to retrieve critical blood group and allergy alerts instantly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-xs backdrop-blur-sm">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 border border-purple-100">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-navy-900">Doctor Verified Portal</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                    Licensed physicians conduct secure telemedicine consults and issue authenticated prescriptions.
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-4 pt-2 border-t border-slate-200/60 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-emerald-500" />
                HIPAA &amp; ABDM Ready
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-trust-500" />
                256-Bit Cryptography
              </span>
            </div>
          </div>

          {/* Right Column / Mobile Main Content */}
          <div className="w-full lg:col-span-7">
            
            {/* Header on Mobile & Tablet (< lg) */}
            <div className="lg:hidden text-center mb-6">
              <Link to="/" className="inline-flex items-center gap-2.5 mb-2">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-trust-600 text-white flex items-center justify-center shadow-lg shadow-trust-600/30">
                  <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xl sm:text-2xl font-extrabold text-navy-900 tracking-tight">AyuRaksha</span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-emerald-600">Life Saver</span>
                </div>
              </Link>
              <h2 className="text-xl sm:text-2xl font-bold text-navy-900 tracking-tight">
                {mode === 'login' ? 'Access your medical vault' : 'Create your decentralized EHR'}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto px-2">
                End-to-end encrypted clinical records &amp; emergency QR network
              </p>
            </div>

            {/* Main Auth Card */}
            <div className="bg-white/95 backdrop-blur-sm p-4 sm:p-7 md:p-8 shadow-xl shadow-slate-200/70 rounded-2xl sm:rounded-3xl border border-slate-200/90 transition-all">
              
              {/* Header inside desktop card */}
              <div className="hidden lg:block mb-6">
                <h2 className="text-2xl font-extrabold text-navy-900 tracking-tight">
                  {mode === 'login' ? 'Access your medical vault' : 'Create your decentralized EHR'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {mode === 'login' 
                    ? 'Enter your credentials to manage your encrypted health records.' 
                    : 'Set up your cryptographic identity in less than two minutes.'}
                </p>
              </div>

              {/* Quick Demo Credential Bar */}
              <div className="mb-5 p-2.5 sm:p-3.5 bg-slate-50/90 rounded-xl sm:rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-500 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Quick 1-Click Demo Fill:
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('patient')}
                    title="Load Patient Credentials"
                    className="px-1.5 py-1.5 sm:px-2.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-trust-50 hover:border-trust-300 hover:text-trust-700 transition flex items-center justify-center gap-1 shadow-xs active:scale-95"
                  >
                    <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-trust-600 shrink-0" />
                    <span className="truncate">Patient</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('doctor')}
                    title="Load Doctor Credentials"
                    className="px-1.5 py-1.5 sm:px-2.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-trust-50 hover:border-trust-300 hover:text-trust-700 transition flex items-center justify-center gap-1 shadow-xs active:scale-95"
                  >
                    <Stethoscope className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Doctor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('admin')}
                    title="Load Admin Credentials"
                    className="px-1.5 py-1.5 sm:px-2.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-trust-50 hover:border-trust-300 hover:text-trust-700 transition flex items-center justify-center gap-1 shadow-xs active:scale-95"
                  >
                    <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-600 shrink-0" />
                    <span className="truncate">Admin</span>
                  </button>
                </div>
              </div>

              {/* Role Selector Tabs (Patient vs Doctor) */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-slate-100 rounded-xl sm:rounded-2xl mb-5">
                <button
                  type="button"
                  onClick={() => setRole('patient')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition ${
                    role === 'patient'
                      ? 'bg-white text-navy-900 shadow-sm'
                      : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-trust-600 shrink-0" />
                  <span className="truncate">Patient Vault</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('doctor')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition ${
                    role === 'doctor'
                      ? 'bg-white text-navy-900 shadow-sm'
                      : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-trust-600 shrink-0" />
                  <span className="truncate">Doctor Portal</span>
                </button>
              </div>

              {/* Login vs Register Switch */}
              <div className="flex border-b border-slate-200 mb-5">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold flex-1 text-center transition border-b-2 ${
                    mode === 'login'
                      ? 'border-trust-600 text-trust-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold flex-1 text-center transition border-b-2 ${
                    mode === 'register'
                      ? 'border-trust-600 text-trust-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Create New Vault
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={role === 'doctor' ? 'Dr. Jane Smith, MD' : 'Alex Morgan'}
                        className="w-full pl-9 sm:pl-10 pr-3.5 sm:pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 focus:border-trust-500 transition"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@ayuraksha.io"
                      className="w-full pl-9 sm:pl-10 pr-3.5 sm:pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 focus:border-trust-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 sm:pl-10 pr-10 sm:pr-11 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 focus:border-trust-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Additional Patient Details when registering */}
                {mode === 'register' && role === 'patient' && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2.5 sm:gap-3">
                      <div>
                        <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Age
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="130"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="34"
                          className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Blood Group
                        </label>
                        <select
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value)}
                          className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                        >
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Allergies (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="Penicillin, Latex, Peanuts"
                        className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                      />
                    </div>
                  </div>
                )}

                {/* Additional Doctor Details when registering */}
                {mode === 'register' && role === 'doctor' && (
                  <div className="grid grid-cols-1 min-[440px]:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Specialization
                      </label>
                      <input
                        type="text"
                        required
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="Cardiology, General..."
                        className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Medical License #
                      </label>
                      <input
                        type="text"
                        required
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="MED-US-998124"
                        className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-trust-600 hover:bg-trust-700 active:scale-[0.98] transition shadow-md shadow-trust-600/30 disabled:opacity-50 min-h-[44px]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Sign In to Vault' : 'Provision Secure Vault'}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </>
                  )}
                </button>
              </form>

              {/* Web3 / Wallet Connect Option */}
              <div className="mt-5 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleWalletConnect}
                  disabled={walletConnecting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition active:scale-[0.98] min-h-[42px]"
                >
                  <Wallet className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">
                    {walletConnecting ? (
                      'Connecting Web3 Provider...'
                    ) : (
                      <>
                        Connect Web3 Wallet <span className="hidden sm:inline">(MetaMask / Phantom)</span>
                      </>
                    )}
                  </span>
                </button>
              </div>

              {/* Emergency / Shared Portal Link */}
              <div className="mt-4 text-center">
                <Link
                  to="/shared-portal"
                  className="text-[11px] sm:text-xs text-trust-600 hover:text-trust-700 hover:underline font-semibold block leading-relaxed px-1"
                >
                  Emergency Responder or Doctor without credentials? Access Shared Portal &rarr;
                </Link>
              </div>

              {/* Micro Trust Indicators on Mobile */}
              <div className="lg:hidden mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-3 text-[10px] sm:text-[11px] text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-trust-500" />
                  AES-256 Encrypted
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  HIPAA / ABDM Ready
                </span>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white/50 backdrop-blur-xs">
        <p className="px-4">
          &copy; {new Date().getFullYear()} AyuRaksha Life Saver. Decentralized &amp; Cryptographically Secured Health Intelligence.
        </p>
      </footer>
    </div>
  );
}
