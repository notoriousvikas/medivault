import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import OverviewStats from '../components/dashboard/OverviewStats';
import QuickActions from '../components/dashboard/QuickActions';
import RecordCard from '../components/dashboard/RecordCard';
import PrescriptionsList from '../components/dashboard/PrescriptionsList';
import MedicalTimeline from '../components/dashboard/MedicalTimeline';
import UploadRecordModal from '../components/dashboard/UploadRecordModal';
import ShareAccessModal from '../components/dashboard/ShareAccessModal';
import EmergencyQRModal from '../components/dashboard/EmergencyQRModal';
import SplitRecordViewerModal from '../components/records/SplitRecordViewerModal';
import AiChatAssistantDrawer from '../components/dashboard/AiChatAssistantDrawer';
import EditProfileModal from '../components/profile/EditProfileModal';
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

  // Filter & Search states
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'Lab Report' | 'Prescription' | 'Scan' | 'Discharge Summary'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('grid'); // 'grid' | 'timeline' | 'prescriptions'

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

  // Fetch real backend data
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

      // Fetch emergency profile
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
    setRecords((prev) =>
      prev.map((r) => (r._id === updatedRecord._id ? updatedRecord : r))
    );
    if (selectedRecord?._id === updatedRecord._id) {
      setSelectedRecord(updatedRecord);
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* User Welcome Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
                Health Vault: {user?.name || 'Patient'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                Encrypted Vault Active
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Secure health vault with instant-response Emergency QR and Aarogya AI clinical intelligence.
            </p>

            {/* Inline vitals strip */}
            {(user?.bloodGroup || user?.allergies?.length > 0 || user?.isVerified) && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {user?.bloodGroup && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                    🩸 {user.bloodGroup}
                  </span>
                )}
                {user?.allergies?.slice(0, 3).map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                    ⚠ {a}
                  </span>
                ))}
                {user?.allergies?.length > 3 && (
                  <span className="text-xs text-slate-400 font-medium">+{user.allergies.length - 3} more</span>
                )}
                {user?.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                    ✓ Verified
                  </span>
                )}
                {!user?.bloodGroup && !user?.allergies?.length && (
                  <button
                    onClick={() => setIsEditProfileOpen(true)}
                    className="text-xs text-trust-600 font-semibold hover:underline"
                  >
                    + Complete your health profile
                  </button>
                )}
              </div>
            )}
            {(!user?.bloodGroup && !user?.allergies?.length) && (
              <div className="mt-2">
                <button
                  onClick={() => setIsEditProfileOpen(true)}
                  className="text-xs text-trust-600 font-semibold hover:underline"
                >
                  + Complete your health profile →
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/consultations"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-trust-50 border border-trust-200 text-trust-700 hover:bg-trust-100 rounded-xl text-xs font-bold transition shadow-sm"
              title="Doctor Consultations & Chat"
            >
              <MessageSquare className="w-3.5 h-3.5 text-trust-600" />
              <span>{user?.role === 'doctor' ? 'Patient Consults' : 'Doctor Chat'}</span>
            </Link>
            <button
              onClick={() => setIsEditProfileOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:text-navy-900 rounded-xl text-xs font-bold transition shadow-sm"
              title="Edit Health Profile"
            >
              <UserPen className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:text-navy-900 rounded-xl text-xs font-bold transition shadow-sm"
              title="Refresh Vault Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* 1. Overview Stat Cards */}
        <OverviewStats
          recordsCount={records.length}
          prescriptionsCount={prescriptions.length}
          emergencyScansCount={user?.emergencyAccessLogs?.length || 0}
          lastSync={records[0]?.uploadDate || null}
        />

        {/* 2. Quick Actions Bar */}
        <QuickActions
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
          onOpenEmergency={() => setIsEmergencyOpen(true)}
          onOpenAiAssistant={() => {
            setChatReferenceRecord(null);
            setIsAiChatOpen(true);
          }}
        />

        {/* 3. Main Vault Content Tabs & Controls */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* View Switcher: Records Grid vs Timeline vs Prescriptions */}
            <div className="flex items-center p-1 bg-slate-200/70 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveView('grid')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${
                  activeView === 'grid'
                    ? 'bg-white text-navy-900 shadow-sm'
                    : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Medical Records ({records.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('timeline')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${
                  activeView === 'timeline'
                    ? 'bg-white text-navy-900 shadow-sm'
                    : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Health Timeline</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('prescriptions')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${
                  activeView === 'prescriptions'
                    ? 'bg-white text-navy-900 shadow-sm'
                    : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                <span>Prescriptions ({prescriptions.length})</span>
              </button>
            </div>

            {/* Search and Category Filter (When in Grid view) */}
            {activeView === 'grid' && (
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search records, tests..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Category Tabs for Records View */}
          {activeView === 'grid' && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-slate-200/80 pb-3">
              {[
                { label: 'All Records', value: 'all' },
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
                      ? 'bg-trust-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* View Content Rendering */}
          {activeView === 'grid' && (
            <div>
              {loading ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-trust-600 animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-slate-600">Loading Medical Records from Vault...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-trust-50 text-trust-600 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-navy-900 text-lg">No medical records found</h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                    {searchQuery
                      ? 'No documents matched your query. Try searching with another keyword.'
                      : 'Start building your comprehensive health vault by uploading your first lab report or scan.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-trust-600 text-white text-xs font-bold hover:bg-trust-700 transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload Medical Document</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {activeView === 'timeline' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
              <h3 className="text-base font-bold text-navy-900 mb-6">Chronological Medical Timeline</h3>
              <MedicalTimeline
                events={timelineEvents}
                onEventClick={(recordId) => {
                  const target = records.find((r) => r._id === recordId);
                  if (target) setSelectedRecord(target);
                }}
              />
            </div>
          )}

          {activeView === 'prescriptions' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
              <PrescriptionsList
                prescriptions={prescriptions}
                onPrescriptionAdded={(p) => setPrescriptions((prev) => [p, ...prev])}
                onPrescriptionDeleted={(id) => setPrescriptions((prev) => prev.filter((p) => p._id !== id))}
                onPrescriptionUpdated={(updated) =>
                  setPrescriptions((prev) => prev.map((p) => (p._id === updated._id ? updated : p)))
                }
              />
            </div>
          )}

        </div>

      </main>

      {/* Modals & Drawers */}
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
        onProfileUpdated={(updatedUser) => {
          updateUserData(updatedUser);
          setIsEditProfileOpen(false);
        }}
      />

    </div>
  );
}
