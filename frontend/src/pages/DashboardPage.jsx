import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import RecordCard from '../components/dashboard/RecordCard';
import PrescriptionsList from '../components/dashboard/PrescriptionsList';
import MedicalTimeline from '../components/dashboard/MedicalTimeline';
import UploadRecordModal from '../components/dashboard/UploadRecordModal';
import ShareAccessModal from '../components/dashboard/ShareAccessModal';
import EmergencyQRModal from '../components/dashboard/EmergencyQRModal';
import PatientConsultationQRModal from '../components/dashboard/PatientConsultationQRModal';
import SplitRecordViewerModal from '../components/records/SplitRecordViewerModal';
import AiChatAssistantDrawer from '../components/dashboard/AiChatAssistantDrawer';
import EditProfileModal from '../components/profile/EditProfileModal';
import DoctorDashboardView from '../components/dashboard/DoctorDashboardView';
import AreaHealthMonitoringView from '../components/dashboard/AreaHealthMonitoringView';
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
  Radio,
  PhoneCall,
} from 'lucide-react';

export default function DashboardPage({ defaultView, defaultTab, defaultEmergencyOpen = false }) {
  const { user, isAuthenticated, isLoading: authLoading, updateUserData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const toast = useToast();

  // Helper to resolve current view & tab based on route props, URL pathname, or query parameters
  const resolveCurrentView = useCallback(() => {
    const path = location.pathname.toLowerCase();

    if (defaultView) {
      const tabParam = searchParams.get('tab');
      return {
        view: defaultView,
        tab: defaultTab || tabParam || 'all',
      };
    }

    if (path.includes('timeline')) {
      return { view: 'timeline', tab: 'all' };
    }
    if (path.includes('prescription')) {
      return { view: 'prescriptions', tab: 'all' };
    }
    if (path.includes('imaging') || path.includes('scan')) {
      return { view: 'grid', tab: 'Scan' };
    }
    if (path.includes('jagruti') || path.includes('alert')) {
      return { view: 'area-alerts', tab: 'all' };
    }

    const tabParam = searchParams.get('tab');
    return { view: 'grid', tab: tabParam || 'all' };
  }, [location.pathname, searchParams, defaultView, defaultTab]);

  const initialViewConfig = resolveCurrentView();

  // Data states
  const [records, setRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [emergencyProfile, setEmergencyProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // View & Filter states
  const [activeView, setActiveView] = useState(initialViewConfig.view);
  const [activeTab, setActiveTab] = useState(initialViewConfig.tab);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal & Drawer states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(
    defaultEmergencyOpen || location.pathname.toLowerCase().includes('prana')
  );
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isPatientQRModalOpen, setIsPatientQRModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [chatReferenceRecord, setChatReferenceRecord] = useState(null);
  const [openLiveVoiceImmediately, setOpenLiveVoiceImmediately] = useState(false);

  // Sync active view and tab when URL pathname or searchParams change
  useEffect(() => {
    const current = resolveCurrentView();
    setActiveView(current.view);
    setActiveTab(current.tab);

    if (current.view === 'timeline') {
      document.title = 'Medical Timeline | AyuRaksha';
    } else if (current.view === 'prescriptions') {
      document.title = 'AI Prescriptions | AyuRaksha';
    } else if (current.view === 'grid' && current.tab === 'Scan') {
      document.title = 'Imaging Scans & X-Rays | AyuRaksha';
    } else if (current.view === 'area-alerts') {
      document.title = 'Jagruti Health Alerts | AyuRaksha';
    } else {
      document.title = 'Medical Vault | AyuRaksha';
    }
  }, [resolveCurrentView]);

  // Open emergency modal if routed to /pranaSetu or defaultEmergencyOpen
  useEffect(() => {
    if (defaultEmergencyOpen || location.pathname.toLowerCase().includes('prana')) {
      setIsEmergencyOpen(true);
    }
  }, [defaultEmergencyOpen, location.pathname]);

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
                  setSidebarOpen(false);
                  navigate('/medicalRecords');
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
                  setSidebarOpen(false);
                  navigate('/medicalTimeline');
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
                  setSidebarOpen(false);
                  navigate('/aiPrescriptions');
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
                  setSidebarOpen(false);
                  navigate('/imagingScans');
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

              {/* PranaSetu */}
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setIsEmergencyOpen(true);
                  navigate('/pranaSetu');
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50/80 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <QrCode className="w-4 h-4 text-rose-600" />
                  <span>PranaSetu</span>
                </div>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                  Live
                </span>
              </button>

              {/* Jagruti Alerts */}
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  navigate('/jagrutiAlerts');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition group ${
                  activeView === 'area-alerts'
                    ? 'bg-trust-600 text-white shadow-sm shadow-trust-600/30'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-navy-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Radio className={`w-4 h-4 ${activeView === 'area-alerts' ? 'text-white' : 'text-rose-500'}`} />
                  <span>Jagruti Alerts</span>
                </div>
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                    activeView === 'area-alerts'
                      ? 'bg-white/20 text-white'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  Cluster AI
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

              {/* Patient Doctor Registration QR Button */}
              {user?.role !== 'doctor' && (
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    setIsPatientQRModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-trust-700 bg-trust-50/70 hover:bg-trust-100/70 border border-trust-200/50 transition group"
                  title="Present your QR code to your doctor to register"
                >
                  <div className="flex items-center gap-2.5">
                    <QrCode className="w-4 h-4 text-trust-600" />
                    <span>Doctor Registration QR</span>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-trust-200 text-trust-800">
                    Scan Me
                  </span>
                </button>
              )}

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
                Ask medical questions or start hands-free Live Audio Call anytime.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    setChatReferenceRecord(null);
                    setOpenLiveVoiceImmediately(false);
                    setIsAiChatOpen(true);
                  }}
                  className="py-2 px-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition flex items-center justify-center gap-1 border border-white/20"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Text Chat</span>
                </button>
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    setChatReferenceRecord(null);
                    setOpenLiveVoiceImmediately(true);
                    setIsAiChatOpen(true);
                  }}
                  className="py-2 px-2 rounded-xl bg-white text-emerald-800 font-extrabold text-xs hover:bg-emerald-50 transition shadow-sm flex items-center justify-center gap-1"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>Live Call</span>
                </button>
              </div>
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
                  {activeView === 'area-alerts' && 'Jagruti Community Health & Risk Alerts'}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeView === 'grid' && `Stored & verified clinical documents (${filteredRecords.length})`}
                  {activeView === 'timeline' && `Aggregated health events & diagnostics (${timelineEvents.length})`}
                  {activeView === 'prescriptions' && `Active pharmacy medications & drug evaluations (${prescriptions.length})`}
                  {activeView === 'area-alerts' && 'Automated geospatial anomaly screening & community health vigilance alerts'}
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

              {/* PranaSetu trigger */}
              <button
                onClick={() => setIsEmergencyOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs hover:bg-rose-100 transition shadow-sm"
              >
                <QrCode className="w-3.5 h-3.5 text-rose-600" />
                <span>PranaSetu</span>
              </button>

              {/* Patient Doctor QR trigger */}
              {user?.role !== 'doctor' && (
                <button
                  onClick={() => setIsPatientQRModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-trust-700 font-bold text-xs hover:bg-blue-100 transition shadow-sm"
                  title="Show your QR code for doctor to scan and admit you"
                >
                  <QrCode className="w-3.5 h-3.5 text-trust-600" />
                  <span className="hidden sm:inline">Doctor QR</span>
                  <span className="sm:hidden">QR</span>
                </button>
              )}

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
                    { label: 'All', value: 'all', to: '/medicalRecords' },
                    { label: 'Lab Reports', value: 'Lab Report', to: '/medicalRecords?tab=Lab+Report' },
                    { label: 'Prescriptions', value: 'Prescription', to: '/aiPrescriptions' },
                    { label: 'Imaging & Scans', value: 'Scan', to: '/imagingScans' },
                    { label: 'Discharge Summaries', value: 'Discharge Summary', to: '/medicalRecords?tab=Discharge+Summary' },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        if (tab.to) {
                          navigate(tab.to);
                        } else {
                          setActiveTab(tab.value);
                        }
                      }}
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

          {/* VIEW 4: Area Health Risk Detection & Alerts */}
          {activeView === 'area-alerts' && (
            <AreaHealthMonitoringView
              onOpenAiChat={() => {
                setChatReferenceRecord(null);
                setIsAiChatOpen(true);
              }}
            />
          )}

        </main>
      </div>

      {/* ── Persistent Floating AI Chat Trigger (Aligned with Navbar / max-w-7xl layout) ── */}
      <div className="fixed bottom-6 inset-x-0 pointer-events-none z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end gap-2.5">
          {/* Direct Live Audio Call Button */}
          <button
            onClick={() => {
              setChatReferenceRecord(null);
              setOpenLiveVoiceImmediately(true);
              setIsAiChatOpen(true);
            }}
            className="pointer-events-auto inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all border border-emerald-400/30"
            title="Start Continuous Live Audio Call with Aarogya AI"
          >
            <PhoneCall className="w-4 h-4 text-white animate-pulse" />
            <span className="hidden sm:inline">Live Audio Call</span>
            <span className="sm:hidden">Live Call</span>
          </button>

          {/* Standard Ask Aarogya AI Button */}
          <button
            onClick={() => {
              setChatReferenceRecord(null);
              setOpenLiveVoiceImmediately(false);
              setIsAiChatOpen(true);
            }}
            className="pointer-events-auto inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-trust-600 via-indigo-600 to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all"
            title="Open Aarogya AI Medical Assistant"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
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
        onClose={() => {
          setIsEmergencyOpen(false);
          if (location.pathname.toLowerCase().includes('prana')) {
            navigate('/medicalRecords', { replace: true });
          }
        }}
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
          setOpenLiveVoiceImmediately(false);
          setIsAiChatOpen(true);
        }}
      />

      <AiChatAssistantDrawer
        isOpen={isAiChatOpen}
        onClose={() => {
          setIsAiChatOpen(false);
          setChatReferenceRecord(null);
          setOpenLiveVoiceImmediately(false);
        }}
        referenceRecord={chatReferenceRecord}
        initialOpenLive={openLiveVoiceImmediately}
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

      <PatientConsultationQRModal
        isOpen={isPatientQRModalOpen}
        onClose={() => setIsPatientQRModalOpen(false)}
      />
    </div>
  );
}
