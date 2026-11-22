import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import RecordCard from '../components/dashboard/RecordCard';
import PrescriptionsList from '../components/dashboard/PrescriptionsList';
import MedicalTimeline from '../components/dashboard/MedicalTimeline';
import UploadRecordModal from '../components/dashboard/UploadRecordModal';
import ShareAccessModal from '../components/dashboard/ShareAccessModal';
import EmergencyQRModal from '../components/dashboard/EmergencyQRModal';
import SplitRecordViewerModal from '../components/records/SplitRecordViewerModal';
import AiChatAssistantDrawer from '../components/dashboard/AiChatAssistantDrawer';
import EditProfileModal from '../components/profile/EditProfileModal';
import DoctorDashboardView from '../components/dashboard/DoctorDashboardView';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { recordsApi } from '../api/records';
import { prescriptionsApi } from '../api/prescriptions';
import { timelineApi } from '../api/timeline';
import { emergencyApi } from '../api/emergency';
import {
  FileText,
  Search,
  LayoutGrid,
  Calendar,
  Sparkles,
  RefreshCw,
  Plus,
  UserPen,
  MessageSquare,
  QrCode,
  Pill,
  ScanLine,
  Share2,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  Bot,
  Activity,
  Heart,
  Lock,
  MapPin,
  Navigation,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading, updateUserData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const toast = useToast();

  // Data states
  const [records, setRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [emergencyProfile, setEmergencyProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // View & Filter states
  const [activeView, setActiveView] = useState('grid'); // 'grid' | 'timeline' | 'prescriptions'
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'Lab Report' | 'Prescription' | 'Scan' | 'Discharge Summary'
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal & Drawer states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [chatReferenceRecord, setChatReferenceRecord] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Open Edit Profile modal if navigated with state
  useEffect(() => {
    if (location.state?.openEditProfile) {
      setIsEditProfileOpen(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Fetch backend data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsRes, prescriptionsRes, timelineRes] = await Promise.allSettled([
        recordsApi.getRecords(),
        prescriptionsApi.getPrescriptions(),
        timelineApi.getEvents(),
      ]);

      if (recordsRes.status === 'fulfilled' && recordsRes.value?.data) {
        setRecords(recordsRes.value.data);
      }
      if (prescriptionsRes.status === 'fulfilled' && prescriptionsRes.value?.data) {
        setPrescriptions(prescriptionsRes.value.data);
      }
      if (timelineRes.status === 'fulfilled' && timelineRes.value?.data) {
        setTimelineEvents(timelineRes.value.data);
      }

      try {
        const emgRes = await emergencyApi.getMyProfile();
        if (emgRes.data) setEmergencyProfile(emgRes.data);
      } catch {
        // Ignored if unconfigured
      }
    } catch (err) {
      console.warn('Dashboard fetch issue:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  // Handle URL query to open record or AI chat directly
  useEffect(() => {
    const chatRecordId = searchParams.get('chatRecord');
    if (chatRecordId && records.length > 0) {
      const target = records.find((r) => r._id === chatRecordId);
      if (target) {
        setChatReferenceRecord(target);
        setIsAiChatOpen(true);
      }
    }
  }, [searchParams, records]);

  // Handlers
  const handleRecordCreated = (newRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
    fetchData();
  };

  const handleRecordDeleted = (id) => {
    setRecords((prev) => prev.filter((r) => r._id !== id));
  };

  const handleRecordAnalyzed = (updatedRecord) => {
    if (!updatedRecord) return;
    const targetId = updatedRecord._id || updatedRecord.recordId || updatedRecord.id;
    if (!targetId) return;
    const normalized = { ...updatedRecord, _id: targetId };

    setRecords((prev) =>
      prev.map((r) => (r._id === targetId || r.id === targetId ? normalized : r))
    );
    if (selectedRecord && (selectedRecord._id === targetId || selectedRecord.id === targetId)) {
      setSelectedRecord(normalized);
    }
  };

  // Filtered records
  const filteredRecords = records.filter((r) => {
    const matchesTab =
      activeTab === 'all' ||
      (r.category && r.category.toLowerCase() === activeTab.toLowerCase());
    const matchesSearch =
      !searchQuery ||
      r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const scanRecordsCount = records.filter(
    (r) => (r.category || '').toLowerCase() === 'scan'
  ).length;

  // Dedicated Admin Command Center
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Dedicated Doctor Clinical Command Center
  if (user?.role === 'doctor') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <DoctorDashboardView />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6 relative">

        {/* ── Mobile Sidebar Overlay Backdrop ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-navy-900/60 backdrop-blur-sm lg:hidden animate-in fade-in"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Left Slidebar / Sidebar Navigation ── */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50 lg:z-0
            w-72 lg:w-64 xl:w-72 bg-white border-r lg:border border-slate-200/80
            rounded-none lg:rounded-3xl p-5 flex flex-col justify-between
            shadow-xl lg:shadow-sm transition-transform duration-300 ease-in-out
            overflow-y-auto shrink-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="space-y-6">
            
            {/* Top mobile header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 lg:hidden">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-trust-600" />
                <span className="font-extrabold text-sm text-navy-900">Health Vault</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Vitals Mini-Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-trust-50/70 via-slate-50 to-indigo-50/60 border border-trust-100/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-trust-700 font-mono">
                  Patient Vault
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Encrypted
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-navy-900 truncate">
                {user?.name || 'Patient'}
              </h3>

              {/* Vitals badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {user?.bloodGroup && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold">
                    🩸 {user.bloodGroup}
                  </span>
                )}
                {user?.allergies?.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                    ⚠ {user.allergies[0]}
                    {user.allergies.length > 1 && ` +${user.allergies.length - 1}`}
                  </span>
                )}
                {user?.location?.city ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold"
                    title={[user.location.city, user.location.state, user.location.country].filter(Boolean).join(', ')}
                  >
                    <MapPin className="w-2.5 h-2.5 text-sky-600" />
                    <span className="truncate max-w-[80px]">{user.location.city}</span>
                  </span>
                ) : user?.location?.isAllowed ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold"
                    title="GPS Geolocation Active"
                  >
                    <Navigation className="w-2.5 h-2.5 text-emerald-600" />
                    <span>GPS Active</span>
                  </span>
                ) : null}
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    setIsEditProfileOpen(true);
                  }}
                  className="text-[10px] font-bold text-trust-600 hover:underline ml-auto flex items-center gap-0.5"
                >
                  <UserPen className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* ── Navigation Links ── */}
            <nav className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 block mb-2">
                Navigation
              </span>

              {/* Medical Records */}
              <button
                onClick={() => {
                  setActiveView('grid');
                  setActiveTab('all');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeView === 'grid' && activeTab === 'all'
                    ? 'bg-trust-600 text-white shadow-sm shadow-trust-600/30'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-navy-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutGrid className="w-4 h-4" />
                  <span>Medical Records</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    activeView === 'grid' && activeTab === 'all'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {records.length}
                </span>
              </button>

              {/* Health Timeline */}
              <button
                onClick={() => {
                  setActiveView('timeline');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeView === 'timeline'
                    ? 'bg-trust-600 text-white shadow-sm shadow-trust-600/30'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-navy-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4" />
                  <span>Medical Timeline</span>
                </div>
                {timelineEvents.length > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                      activeView === 'timeline'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {timelineEvents.length}
                  </span>
                )}
              </button>

              {/* AI Prescriptions */}
              <button
                onClick={() => {
                  setActiveView('prescriptions');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeView === 'prescriptions'
                    ? 'bg-trust-600 text-white shadow-sm shadow-trust-600/30'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-navy-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Pill className="w-4 h-4 text-emerald-500" />
                  <span>AI Prescriptions</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                    AI Safe
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                      activeView === 'prescriptions'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {prescriptions.length}
                  </span>
                </div>
              </button>

              {/* Imaging & Scans */}
              <button
                onClick={() => {
                  setActiveView('grid');
                  setActiveTab('Scan');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeView === 'grid' && activeTab === 'Scan'
                    ? 'bg-trust-600 text-white shadow-sm shadow-trust-600/30'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-navy-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ScanLine className="w-4 h-4 text-violet-500" />
                  <span>Imaging & X-Rays</span>
                </div>
                {scanRecordsCount > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                      activeView === 'grid' && activeTab === 'Scan'
                        ? 'bg-white/20 text-white'
                        : 'bg-violet-100 text-violet-700'
                    }`}
                  >
                    {scanRecordsCount}
                  </span>
                )}
              </button>

              {/* Emergency QR Pass */}
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setIsEmergencyOpen(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50/80 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <QrCode className="w-4 h-4 text-rose-600" />
                  <span>Emergency QR Pass</span>
                </div>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                  Live
                </span>
              </button>

              {/* Doctor Chat / Consultations */}
              <Link
                to="/consultations"
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100/80 hover:text-navy-900 transition"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-trust-600" />
                  <span>{user?.role === 'doctor' ? 'Patient Consults' : 'Doctor Chat'}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              {/* Share Access Portal */}
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setIsShareOpen(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100/80 hover:text-navy-900 transition"
              >
                <div className="flex items-center gap-2.5">
                  <Share2 className="w-4 h-4 text-slate-500" />
                  <span>Share Vault Access</span>
                </div>
              </button>
            </nav>

            {/* ── Featured Aarogya AI Assistant Callout ── */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-trust-600 text-white space-y-2.5 shadow-md shadow-indigo-500/20">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <span className="text-xs font-extrabold tracking-wide">Aarogya AI Copilot</span>
              </div>
              <p className="text-[11px] text-indigo-100 leading-relaxed font-medium">
                Ask medical questions, review scans, or check drug safety anytime.
              </p>
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setChatReferenceRecord(null);
                  setIsAiChatOpen(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-white text-indigo-700 font-extrabold text-xs hover:bg-indigo-50 transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Open AI Chat</span>
              </button>
            </div>

          </div>

          {/* ── Sidebar Footer: Compact Status & Sync ── */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Encrypted Vault</span>
              </span>
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-1 hover:text-navy-900 transition"
                title="Refresh Vault Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main Workspace Area ── */}
        <main className="flex-1 min-w-0 space-y-6">

          {/* Top Header Bar & Action Controls */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Left: Mobile hamburger + Active Section Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition lg:hidden"
                title="Open slidebar menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-navy-900 tracking-tight">
                  {activeView === 'grid' && (activeTab === 'Scan' ? 'Imaging Scans & X-Rays' : 'Medical Records Vault')}
                  {activeView === 'timeline' && 'Chronological Medical Timeline'}
                  {activeView === 'prescriptions' && 'AI Prescriptions & Safety Checks'}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeView === 'grid' && `Stored & verified clinical documents (${filteredRecords.length})`}
                  {activeView === 'timeline' && `Aggregated health events & diagnostics (${timelineEvents.length})`}
                  {activeView === 'prescriptions' && `Active pharmacy medications & drug evaluations (${prescriptions.length})`}
                </p>
              </div>
            </div>

            {/* Right: Primary Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Upload button */}
              <button
                onClick={() => setIsUploadOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-trust-600 text-white font-bold text-xs hover:bg-trust-700 transition shadow-sm shadow-trust-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Record</span>
              </button>

              {/* AI Chat trigger */}
              <button
                onClick={() => {
                  setChatReferenceRecord(null);
                  setIsAiChatOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Aarogya AI</span>
                <span className="sm:hidden">AI Chat</span>
              </button>

              {/* Emergency QR trigger */}
              <button
                onClick={() => setIsEmergencyOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs hover:bg-rose-100 transition shadow-sm"
              >
                <QrCode className="w-3.5 h-3.5 text-rose-600" />
                <span>QR Pass</span>
              </button>

              {/* Sync button */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-navy-900 rounded-xl text-xs font-bold transition shadow-sm"
                title="Sync Vault Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

          </div>

          {/* ── Active View Rendering ── */}

          {/* VIEW 1: Medical Records Grid */}
          {activeView === 'grid' && (
            <div className="space-y-4">
              
              {/* Search & Category Tabs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                
                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: 'All', value: 'all' },
                    { label: 'Lab Reports', value: 'Lab Report' },
                    { label: 'Prescriptions', value: 'Prescription' },
                    { label: 'Imaging & Scans', value: 'Scan' },
                    { label: 'Discharge Summaries', value: 'Discharge Summary' },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveTab(tab.value)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                        activeTab === tab.value
                          ? 'bg-navy-900 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search Box */}
                <div className="relative sm:w-60">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search records..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                  />
                </div>
              </div>

              {/* Records Grid */}
              {loading && records.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
                  <RefreshCw className="w-8 h-8 text-trust-600 animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-slate-600">Loading your encrypted records...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-trust-50 text-trust-600 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-navy-900">No medical records found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {searchQuery
                      ? `No records matching "${searchQuery}". Clear your search to view all records.`
                      : 'Upload your first medical report, X-ray scan, or clinical note to begin.'}
                  </p>
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-trust-600 text-white font-bold text-xs hover:bg-trust-700 transition shadow-sm mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload Record</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredRecords.map((record) => (
                    <RecordCard
                      key={record._id}
                      record={record}
                      onView={(rec) => setSelectedRecord(rec)}
                      onDeleted={handleRecordDeleted}
                      onAnalyzed={handleRecordAnalyzed}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: Health Timeline */}
          {activeView === 'timeline' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
              <MedicalTimeline
                events={timelineEvents}
                onEventClick={(recordId) => {
                  const target = records.find(
                    (r) => r._id?.toString() === recordId?.toString()
                  );
                  if (target) setSelectedRecord(target);
                }}
              />
            </div>
          )}

          {/* VIEW 3: AI Prescriptions List */}
          {activeView === 'prescriptions' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
              <PrescriptionsList
                prescriptions={prescriptions}
                onPrescriptionAdded={(p) => setPrescriptions((prev) => [p, ...prev])}
                onPrescriptionDeleted={(id) =>
                  setPrescriptions((prev) => prev.filter((p) => p._id !== id))
                }
                onPrescriptionUpdated={(updated) =>
                  setPrescriptions((prev) =>
                    prev.map((p) => (p._id === updated._id ? updated : p))
                  )
                }
              />
            </div>
          )}

        </main>
      </div>

      {/* ── Persistent Floating AI Chat Trigger (Aligned with Navbar / max-w-7xl layout) ── */}
      <div className="fixed bottom-6 inset-x-0 pointer-events-none z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
          <button
            onClick={() => {
              setChatReferenceRecord(null);
              setIsAiChatOpen(true);
            }}
            className="pointer-events-auto inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-trust-600 via-indigo-600 to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all"
            title="Open Aarogya AI Medical Assistant"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Ask Aarogya AI</span>
          </button>
        </div>
      </div>

      {/* ── Modals & Drawers ── */}
      <UploadRecordModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleRecordCreated}
      />

      <ShareAccessModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        user={user}
      />

      <EmergencyQRModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        user={user}
        onUserUpdate={updateUserData}
      />

      <SplitRecordViewerModal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        onRecordUpdated={handleRecordAnalyzed}
        onOpenAiChat={(rec) => {
          setChatReferenceRecord(rec);
          setIsAiChatOpen(true);
        }}
      />

      <AiChatAssistantDrawer
        isOpen={isAiChatOpen}
        onClose={() => {
          setIsAiChatOpen(false);
          setChatReferenceRecord(null);
        }}
        referenceRecord={chatReferenceRecord}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        user={user}
        onProfileUpdated={(updated) => {
          if (updateUserData) updateUserData(updated);
          fetchData();
        }}
        onUpdateSuccess={(updated) => {
          if (updateUserData) updateUserData(updated);
          fetchData();
        }}
      />
    </div>
  );
}
