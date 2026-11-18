import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShieldCheck, Lock, Mail, KeyRound, User, UserCheck, Stethoscope, ArrowRight, Wallet, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, register, isAuthenticated, user } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');
  const [role, setRole] = useState('patient'); // 'patient' | 'doctor'
  const [loading, setLoading] = useState(false);
  const [walletConnecting, setWalletConnecting] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [specialization, setSpecialization] = useState('General Medicine');
  const [licenseNumber, setLicenseNumber] = useState('');

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
        await login(email, password);
        toast.success('Welcome back!', 'Successfully authenticated to your medical vault.');
        navigate('/dashboard');
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

        await register(registerPayload);
        toast.success('Account Created', 'Your decentralized medical vault has been provisioned.');
        navigate('/dashboard');
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
      setEmail('patient@medivault.io');
      setPassword('Password123!');
      setRole('patient');
      setMode('login');
      toast.info('Demo Credentials Loaded', 'Patient credentials auto-filled. Click "Sign In" or submit.');
    } else if (demoRole === 'doctor') {
      setEmail('doctor@medivault.io');
      setPassword('Password123!');
      setRole('doctor');
      setMode('login');
      toast.info('Demo Credentials Loaded', 'Doctor credentials auto-filled. Click "Sign In" or submit.');
    } else if (demoRole === 'admin') {
      setEmail('admin@medivault.io');
      setPassword('Password123!');
      setRole('patient');
      setMode('login');
      toast.info('Demo Credentials Loaded', 'Admin credentials auto-filled. Click "Sign In" or submit.');
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-trust-600 text-white flex items-center justify-center shadow-lg shadow-trust-600/30">
            <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
          </div>
          <span className="text-2xl font-extrabold text-navy-900 tracking-tight">MediVault</span>
        </Link>
        <h2 className="text-2xl font-bold text-navy-900 tracking-tight">
          {mode === 'login' ? 'Access your medical vault' : 'Create your decentralized EHR'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          End-to-end encrypted clinical records & emergency QR network
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80 sm:px-10">

          {/* Quick Demo Credential Bar */}
          <div className="mb-6 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick 1-Click Demo Fill:
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('patient')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-trust-50 hover:border-trust-300 hover:text-trust-700 transition"
              >
                👤 Patient
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('doctor')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-trust-50 hover:border-trust-300 hover:text-trust-700 transition"
              >
                🩺 Doctor
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-trust-50 hover:border-trust-300 hover:text-trust-700 transition"
              >
                🛡️ Admin
              </button>
            </div>
          </div>

          {/* Role Selector Tabs (Patient vs Doctor) */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setRole('patient')}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition ${
                role === 'patient'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              <User className="w-4 h-4 text-trust-600" />
              <span>Patient Vault</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('doctor')}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition ${
                role === 'doctor'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-trust-600" />
              <span>Doctor Portal</span>
            </button>
          </div>

          {/* Login vs Register Switch */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`pb-3 text-sm font-bold flex-1 text-center transition border-b-2 ${
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
              className={`pb-3 text-sm font-bold flex-1 text-center transition border-b-2 ${
                mode === 'register'
                  ? 'border-trust-600 text-trust-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Create New Vault
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === 'doctor' ? 'Dr. Jane Smith, MD' : 'Alex Morgan'}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@medivault.io"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                />
              </div>
            </div>

            {/* Additional Patient Details when registering */}
            {mode === 'register' && role === 'patient' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="34"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
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
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Allergies (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="Penicillin, Latex, Peanuts"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                  />
                </div>
              </div>
            )}

            {/* Additional Doctor Details when registering */}
            {mode === 'register' && role === 'doctor' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    required
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="Cardiology, Oncology..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Medical License #
                  </label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="MED-US-998124"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-trust-600 hover:bg-trust-700 active:scale-95 transition shadow-md shadow-trust-600/30 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Vault' : 'Provision Secure Vault'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Web3 / Wallet Connect Option */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={handleWalletConnect}
              disabled={walletConnecting}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95"
            >
              <Wallet className="w-4 h-4 text-indigo-600" />
              <span>{walletConnecting ? 'Connecting Web3 Provider...' : 'Connect Decentralized Wallet (MetaMask / Phantom)'}</span>
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link to="/shared-portal" className="text-xs text-trust-600 hover:underline font-semibold">
              Emergency Responder or Doctor without credentials? Access Shared Portal &rarr;
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
