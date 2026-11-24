import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { consultationsApi } from '../api/consultations';
import { recordsApi } from '../api/records';
import { appointmentsApi } from '../api/appointments';
import BookAppointmentModal from '../components/appointments/BookAppointmentModal';
import DoctorScheduleModal from '../components/appointments/DoctorScheduleModal';
import DoctorPatientScannerModal from '../components/dashboard/DoctorPatientScannerModal';
import PatientConsultationQRModal from '../components/dashboard/PatientConsultationQRModal';
import {
  MessageSquare,
  Send,
  Search,
  User,
  Stethoscope,
  ShieldCheck,
  Paperclip,
  X,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Phone,
  Mail,
  Heart,
  Calendar,
  Sparkles,
  ScanLine,
  QrCode,
} from 'lucide-react';

export default function DoctorChatPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const isDoctor = user?.role === 'doctor';

  // Data states
  const [consultations, setConsultations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [myRecords, setMyRecords] = useState([]);

  // UI & Input states
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'appointments' | 'doctors'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');
  const [messageInput, setMessageInput] = useState('');
  const [selectedRecordAttachment, setSelectedRecordAttachment] = useState(null);
  const [isRecordPickerOpen, setIsRecordPickerOpen] = useState(false);
  const [isPatientInfoModalOpen, setIsPatientInfoModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState(null);
  const [doctorAvailability, setDoctorAvailability] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPatientQRModalOpen, setIsPatientQRModalOpen] = useState(false);

  // Loading states
  const [loadingConsultations, setLoadingConsultations] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Scroll to bottom of message thread
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load consultations list
  const fetchConsultations = useCallback(async (targetId = null) => {
    try {
      const res = await consultationsApi.getConsultations();
      const list = res.data || [];
      setConsultations(list);

      setActiveConsultation((prevActive) => {
        const idToSelect = targetId || prevActive?._id;
        if (idToSelect) {
          const found = list.find((c) => c._id === idToSelect);
          if (found) return found;
        }
        if (!prevActive && list.length > 0) {
          return list[0];
        }
        return prevActive;
      });
    } catch (err) {
      console.warn('Failed to load consultations:', err.message);
    } finally {
      setLoadingConsultations(false);
    }
  }, []);

  // Load available doctors for patients
  const fetchDoctors = useCallback(async () => {
    if (isDoctor) return;
    setLoadingDoctors(true);
    try {
      const res = await consultationsApi.getDoctors();
      setDoctors(res.data || []);
    } catch (err) {
      console.warn('Failed to load doctors directory:', err.message);
    } finally {
      setLoadingDoctors(false);
    }
  }, [isDoctor]);

  // Load patient records for attachment
  useEffect(() => {
    if (isAuthenticated && !isDoctor) {
      recordsApi
        .getRecords()
        .then((res) => setMyRecords(res.data || []))
        .catch(() => {});
    }
  }, [isAuthenticated, isDoctor]);

  // Load appointments
  const fetchAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      const res = await appointmentsApi.getAppointments();
      setAppointments(res.data || []);
    } catch (err) {
      console.warn('Failed to load appointments:', err.message);
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  // Load doctor availability settings if user is doctor
  const fetchDoctorAvailability = useCallback(async () => {
    if (!isDoctor) return;
    try {
      const res = await appointmentsApi.getDoctorAvailability();
      setDoctorAvailability(res.data);
    } catch (err) {
      console.warn('Failed to fetch doctor availability:', err.message);
    }
  }, [isDoctor]);

  // Initial fetch on mount (run once when authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      const initialId = searchParams.get('id');
      fetchConsultations(initialId);
      fetchDoctors();
      fetchAppointments();
      fetchDoctorAvailability();
    }
  }, [isAuthenticated]);

  const handleUpdateAppointmentStatus = async (appointmentId, status) => {
    try {
      await appointmentsApi.updateAppointmentStatus(appointmentId, { status });
      toast.success('Status Updated', `Appointment marked as ${status}.`);
      await fetchAppointments();
    } catch (err) {
      toast.error('Update Failed', err.message || 'Could not update status.');
    }
  };

  // Load messages whenever activeConsultation changes
  const fetchMessages = useCallback(async (consultationId, silent = false) => {
    if (!consultationId) return;
    if (!silent) setLoadingMessages(true);

    try {
      const res = await consultationsApi.getMessages(consultationId);
      const newMessages = res.data || [];
      setMessages((prev) => {
        // Only update if count or latest ID changed to avoid unnecessary re-renders
        if (
          prev.length !== newMessages.length ||
          prev[prev.length - 1]?._id !== newMessages[newMessages.length - 1]?._id
        ) {
          return newMessages;
        }
        return prev;
      });
    } catch (err) {
      console.warn('Failed to load consultation messages:', err.message);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConsultation?._id) {
      fetchMessages(activeConsultation._id);

      // Only sync URL query if different to prevent searchParams re-render loops
      const currentParamId = searchParams.get('id');
      if (currentParamId !== activeConsultation._id) {
        setSearchParams({ id: activeConsultation._id }, { replace: true });
      }

      // Clear previous interval
      if (pollingRef.current) clearInterval(pollingRef.current);

      // Start polling for real-time messages every 4 seconds
      pollingRef.current = setInterval(() => {
        fetchMessages(activeConsultation._id, true);
      }, 4000);

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    } else {
      setMessages([]);
    }
  }, [activeConsultation?._id, fetchMessages]);

  // Start or open a consultation with a doctor
  const handleStartConsultationWithDoctor = async (doctorId) => {
    try {
      setLoadingConsultations(true);
      const res = await consultationsApi.startOrGetConsultation({ doctorId });
      const consultation = res.data;
      if (consultation) {
        setActiveConsultation(consultation);
        setActiveTab('chats');
        await fetchConsultations(consultation._id);
        toast.success(
          'Consultation Ready',
          `Connected with Dr. ${consultation.doctorId?.name || 'Doctor'}`
        );
      }
    } catch (err) {
      toast.error('Could Not Connect', err.message || 'Failed to start consultation.');
    } finally {
      setLoadingConsultations(false);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if ((!messageInput.trim() && !selectedRecordAttachment) || sending || !activeConsultation) {
      return;
    }

    const text = messageInput.trim() || 'Attached medical record for clinical review:';
    const attachment = selectedRecordAttachment
      ? {
          recordId: selectedRecordAttachment._id,
          title: selectedRecordAttachment.title,
          fileUrl: selectedRecordAttachment.fileUrl,
          category: selectedRecordAttachment.category,
        }
      : undefined;

    setMessageInput('');
    setSelectedRecordAttachment(null);
    setSending(true);

    // Optimistic message
    const tempId = 'temp_' + Date.now();
    const optimisticMsg = {
      _id: tempId,
      consultationId: activeConsultation._id,
      senderId: user?._id || user?.userId,
      senderRole: isDoctor ? 'doctor' : 'patient',
      text,
      recordAttachment: attachment,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await consultationsApi.sendMessage(activeConsultation._id, {
        text,
        recordAttachment: attachment,
      });

      if (res.data) {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? res.data : m))
        );
      }
      fetchConsultations(activeConsultation._id);
    } catch (err) {
      toast.error('Send Failed', err.message || 'Could not send message.');
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // Get other participant profile
  const counterpart = isDoctor
    ? activeConsultation?.patientId
    : activeConsultation?.doctorId;

  // Filtered active conversations
  const filteredConsultations = consultations.filter((c) => {
    const target = isDoctor ? c.patientId : c.doctorId;
    if (!target) return false;
    const nameMatch = target.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const specMatch = target.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || specMatch;
  });

  // Filtered doctors list
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpec =
      selectedSpecialization === 'all' ||
      doc.specialization?.toLowerCase() === selectedSpecialization.toLowerCase();
    return matchesSearch && matchesSpec;
  });

  // Filtered appointments list
  const filteredAppointments = appointments.filter((apt) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    const other = isDoctor ? apt.patientId?.name || '' : apt.doctorId?.name || '';
    const cond = apt.primaryCondition || '';
    const urgency = apt.urgency || '';
    return (
      other.toLowerCase().includes(term) ||
      cond.toLowerCase().includes(term) ||
      urgency.toLowerCase().includes(term)
    );
  });

  const specializations = [
    'all',
    'General Medicine',
    'Cardiology',
    'Pediatrics',
    'Neurology',
    'Orthopedics',
    'Dermatology',
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-trust-600 text-white flex items-center justify-center shadow-md shadow-trust-600/20">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">
                  {isDoctor ? 'Patient Clinical Consultations' : 'Doctor Consultations & Chat'}
                </h1>
                <p className="text-xs text-slate-500">
                  {isDoctor
                    ? 'Review patient medical vault inquiries, vital signs, and provide secure clinical advice.'
                    : 'Connect directly with certified doctors, share medical reports, and receive medical guidance.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDoctor && (
              <>
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-trust-600 to-indigo-600 hover:from-trust-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-trust-600/30"
                  title="Scan Patient PranaSetu QR pass to admit patient directly"
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  <span>Scan Patient QR</span>
                </button>

                <button
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-navy-900 rounded-xl text-xs font-bold transition shadow-xs"
                  title="Manage Clinic Hours & Real-time Availability"
                >
                  <Clock className="w-3.5 h-3.5 text-trust-600" />
                  <span>Clinic Schedule</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      doctorAvailability?.isAvailableForBooking !== false
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                    }`}
                    title={doctorAvailability?.isAvailableForBooking !== false ? 'Available' : 'Away'}
                  />
                </button>
              </>
            )}

            {!isDoctor && (
              <button
                onClick={() => setIsPatientQRModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-trust-600 to-indigo-600 hover:from-trust-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-trust-600/30"
                title="Show your QR code for doctor to scan and admit you"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>My Patient QR</span>
              </button>
            )}

            <button
              onClick={() => {
                fetchConsultations();
                fetchAppointments();
                if (activeConsultation?._id) fetchMessages(activeConsultation._id);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-navy-900 rounded-xl text-xs font-bold transition shadow-xs"
              title="Refresh messages and appointments"
            >
              <RefreshCw className="w-3.5 h-3.5 text-trust-600" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Chat Workspace (2-Column) */}
        <div className="flex-1 bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[620px] max-h-[82vh]">
          {/* Left Column: Sidebar (Conversations / Appointments / Doctor Directory) */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-slate-50/50">
            {/* Top Navigation Tabs */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('chats')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                    activeTab === 'chats'
                      ? 'bg-white text-navy-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chats</span>
                  {consultations.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-trust-100 text-trust-700 text-[10px] rounded-full font-bold">
                      {consultations.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('appointments')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                    activeTab === 'appointments'
                      ? 'bg-white text-navy-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Slots</span>
                  {appointments.length > 0 && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                        appointments.some(
                          (a) =>
                            a.urgency === 'CRITICAL' &&
                            a.status !== 'completed' &&
                            a.status !== 'cancelled'
                        )
                          ? 'bg-rose-100 text-rose-700 animate-pulse'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {appointments.length}
                    </span>
                  )}
                </button>

                {!isDoctor && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('doctors')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                      activeTab === 'doctors'
                        ? 'bg-white text-navy-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Doctors</span>
                    {doctors.length > 0 && (
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold">
                        {doctors.length}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Doctor Quick Scanner Bar */}
              {isDoctor && (
                <div className="mt-2.5 p-2 bg-gradient-to-r from-trust-50 to-indigo-50/60 rounded-xl border border-trust-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-trust-600 text-white flex items-center justify-center shrink-0">
                      <ScanLine className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-navy-900 block truncate">
                        Admit Patient
                      </span>
                      <span className="text-[9px] text-slate-500 block truncate">
                        Scan PranaSetu QR
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="px-2.5 py-1 bg-trust-600 hover:bg-trust-700 text-white text-[10px] font-extrabold rounded-lg shadow-xs transition shrink-0"
                  >
                    Scan QR
                  </button>
                </div>
              )}

              {/* Patient Quick QR Card */}
              {!isDoctor && activeTab === 'chats' && (
                <div className="mt-2.5 p-2 bg-gradient-to-r from-trust-50 to-indigo-50/60 rounded-xl border border-trust-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-trust-600 to-indigo-600 text-white flex items-center justify-center shrink-0">
                      <QrCode className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-navy-900 block truncate">
                        Doctor Registration QR
                      </span>
                      <span className="text-[9px] text-slate-500 block truncate">
                        Let doctor scan to admit you
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPatientQRModalOpen(true)}
                    className="px-2.5 py-1 bg-trust-600 hover:bg-trust-700 text-white text-[10px] font-extrabold rounded-lg shadow-xs transition shrink-0"
                  >
                    Show QR
                  </button>
                </div>
              )}

              {/* Search input */}
              <div className="mt-3 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === 'chats'
                      ? isDoctor
                        ? 'Search patients...'
                        : 'Search conversations...'
                      : 'Search by doctor or specialty...'
                  }
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-500"
                />
              </div>

              {/* Specialization pills when on 'doctors' tab */}
              {activeTab === 'doctors' && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none">
                  {specializations.map((spec) => (
                    <button
                      key={spec}
                      onClick={() => setSelectedSpecialization(spec)}
                      className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        selectedSpecialization === spec
                          ? 'bg-trust-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {spec === 'all' ? 'All' : spec}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
              {activeTab === 'chats' ? (
                /* Conversations List */
                loadingConsultations ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-trust-600" />
                    <span>Loading conversations...</span>
                  </div>
                ) : filteredConsultations.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-slate-600">No conversations yet</p>
                    {!isDoctor && (
                      <div className="flex flex-col gap-2 pt-1 max-w-xs mx-auto">
                        <button
                          onClick={() => setIsPatientQRModalOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-trust-600 to-indigo-600 text-white text-xs font-bold hover:from-trust-700 hover:to-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Show Doctor My QR</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('doctors')}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                        >
                          Find a Doctor
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  filteredConsultations.map((c) => {
                    const person = isDoctor ? c.patientId : c.doctorId;
                    if (!person) return null;
                    const isSelected = activeConsultation?._id === c._id;
                    const initials = person.name
                      ? person.name.slice(0, 2).toUpperCase()
                      : 'U';

                    return (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => setActiveConsultation(c)}
                        className={`w-full text-left p-3 rounded-2xl transition flex items-center gap-3 ${
                          isSelected
                            ? 'bg-trust-50/80 border border-trust-200/80 shadow-xs'
                            : 'hover:bg-white hover:shadow-xs border border-transparent'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${
                              isDoctor
                                ? 'bg-gradient-to-br from-indigo-500 to-trust-600 text-white'
                                : 'bg-gradient-to-br from-trust-600 to-mint-600 text-white'
                            }`}
                          >
                            {initials}
                          </div>
                          {person.isVerified && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-navy-900 truncate">
                              {!isDoctor && 'Dr. '}
                              {person.name}
                            </p>
                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                              {c.lastMessageAt
                                ? new Date(c.lastMessageAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {person.specialization ? (
                              <span className="text-trust-600 font-semibold">
                                {person.specialization} •{' '}
                              </span>
                            ) : null}
                            {c.lastMessage || 'Active consultation'}
                          </p>

                          {/* Quick vital tag for doctor viewing patient */}
                          {isDoctor && person.bloodGroup && (
                            <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">
                              🩸 {person.bloodGroup}
                            </span>
                          )}
                        </div>

                        {c.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-trust-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {c.unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })
                )
              ) : activeTab === 'appointments' ? (
                /* Appointments Queue (Priority Sorted: Critical -> Urgent -> Routine) */
                loadingAppointments ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-trust-600" />
                    <span>Loading appointment triage queue...</span>
                  </div>
                ) : filteredAppointments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-slate-600">No appointments scheduled</p>
                    <p className="text-[11px] text-slate-500">
                      {isDoctor
                        ? 'Patients triaged from X-rays will automatically appear in your queue.'
                        : 'Upload an X-ray to auto-book based on clinical findings, or book directly with a doctor.'}
                    </p>
                  </div>
                ) : (
                  filteredAppointments.map((apt) => {
                    const isCritical = apt.urgency === 'CRITICAL';
                    const isUrgent = apt.urgency === 'URGENT';
                    return (
                      <div
                        key={apt._id}
                        className={`p-3 rounded-2xl border transition space-y-2 ${
                          isCritical
                            ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
                            : isUrgent
                            ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                            : 'bg-white border-slate-200/80 hover:border-trust-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                              isCritical
                                ? 'bg-rose-600 text-white animate-pulse'
                                : isUrgent
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isCritical && <AlertCircle className="w-3 h-3" />}
                            {apt.urgency}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              apt.status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : apt.status === 'completed'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {apt.status}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-navy-900">
                            {isDoctor ? apt.patientId?.name || 'Patient' : `Dr. ${apt.doctorId?.name || 'Doctor'}`}
                          </p>
                          <p className="text-[11px] text-slate-600 font-medium">
                            {apt.primaryCondition ? (
                              <span>Finding: <strong className="text-navy-900">{apt.primaryCondition}</strong></span>
                            ) : (
                              'General Consultation'
                            )}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-trust-600" />
                            <span>{apt.timeSlot}</span> &bull; <span>{new Date(apt.appointmentDate).toLocaleDateString()}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          {apt.consultationId && (
                            <button
                              type="button"
                              onClick={async () => {
                                const found = consultations.find((c) => c._id === apt.consultationId);
                                if (found) {
                                  setActiveConsultation(found);
                                } else {
                                  await fetchConsultations();
                                }
                                setActiveTab('chats');
                              }}
                              className="flex-1 py-1.5 px-2.5 rounded-xl bg-trust-600 hover:bg-trust-700 text-white text-xs font-bold flex items-center justify-center gap-1 transition shadow-xs"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Open Chat</span>
                            </button>
                          )}
                          {isDoctor && apt.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateAppointmentStatus(apt._id, 'completed')}
                              className="py-1.5 px-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition border border-emerald-200"
                            >
                              Done
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                /* Doctors Directory List */
                loadingDoctors ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-trust-600" />
                    <span>Finding certified doctors...</span>
                  </div>
                ) : filteredDoctors.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                    <p className="font-semibold text-slate-600">No doctors found</p>
                    <p className="text-[11px]">Try modifying your search or specialization filter.</p>
                  </div>
                ) : (
                  filteredDoctors.map((doc) => {
                    const initials = doc.name ? doc.name.slice(0, 2).toUpperCase() : 'DR';
                    return (
                      <div
                        key={doc._id}
                        className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2 hover:border-trust-300 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-trust-600 to-mint-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-navy-900 truncate">
                                Dr. {doc.name}
                              </h4>
                              {doc.isVerified && (
                                <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold">
                                  Verified
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-trust-600 font-semibold truncate">
                              {doc.specialization || 'General Physician'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                              <span
                                className={`inline-flex items-center gap-1 font-bold ${
                                  doc.isAvailableForBooking !== false
                                    ? 'text-emerald-700'
                                    : 'text-slate-400'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    doc.isAvailableForBooking !== false
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-400'
                                  }`}
                                />
                                {doc.isAvailableForBooking !== false ? 'Available' : 'Away'}
                              </span>
                              {doc.consultationFee !== undefined && (
                                <span className="text-slate-400 font-mono">₹{doc.consultationFee}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleStartConsultationWithDoctor(doc._id)}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDoctorForBooking(doc);
                              setIsBookingModalOpen(true);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-trust-600 hover:bg-trust-700 text-white text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 shadow-xs"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Book Slot</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          {/* Right Column: Active Chat Thread */}
          <div className="flex-1 flex flex-col bg-slate-50/30">
            {activeConsultation && counterpart ? (
              <>
                {/* Active Chat Header */}
                <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-navy-800 to-trust-600 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                      {counterpart.name ? counterpart.name.slice(0, 2).toUpperCase() : 'U'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-navy-900 truncate">
                          {!isDoctor && 'Dr. '}
                          {counterpart.name}
                        </h3>
                        {counterpart.isVerified && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 bg-trust-50 text-trust-700 rounded text-[10px] font-bold">
                          {isDoctor ? 'Patient' : counterpart.specialization || 'Doctor'}
                        </span>
                      </div>

                      <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Encrypted Medical Channel Active
                      </p>
                    </div>
                  </div>

                  {/* Actions on Header */}
                  <div className="flex items-center gap-2">
                    {isDoctor ? (
                      <button
                        type="button"
                        onClick={() => setIsPatientInfoModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                      >
                        <User className="w-3.5 h-3.5 text-trust-600" />
                        <span>Patient Vitals</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsRecordPickerOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-trust-50 hover:bg-trust-100 text-trust-700 border border-trust-200 rounded-xl text-xs font-bold transition"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-trust-600" />
                        <span>Share Record</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
                  {loadingMessages ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-trust-600" />
                      <span className="text-xs">Decrypting consultation messages...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-trust-50 text-trust-600 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-navy-900">Start of Consultation</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isDoctor
                            ? `Respond to ${counterpart.name} regarding their health inquiry.`
                            : `Send a message or attach a lab report/prescription for Dr. ${counterpart.name}.`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe =
                        msg.senderId === user?._id ||
                        msg.senderId === user?.userId ||
                        msg.senderRole === (isDoctor ? 'doctor' : 'patient');

                      return (
                        <div
                          key={msg._id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-xs space-y-2 ${
                              isMe
                                ? 'bg-trust-600 text-white rounded-br-xs'
                                : 'bg-white border border-slate-200/80 text-navy-900 rounded-bl-xs'
                            }`}
                          >
                            {/* Sender badge if counterpart */}
                            {!isMe && (
                              <p className="text-[11px] font-bold text-trust-600 flex items-center gap-1">
                                {msg.senderRole === 'doctor' && '🩺 Dr. '}
                                {counterpart.name}
                              </p>
                            )}

                            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                              {msg.text}
                            </p>

                            {/* Record Attachment Card */}
                            {msg.recordAttachment?.fileUrl && (
                              <div
                                className={`mt-2 p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                                  isMe
                                    ? 'bg-trust-700/60 border-trust-500 text-white'
                                    : 'bg-slate-50 border-slate-200 text-navy-900'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold truncate">
                                      {msg.recordAttachment.title || 'Medical Record'}
                                    </p>
                                    <span className="text-[10px] opacity-80 uppercase tracking-wider font-semibold">
                                      {msg.recordAttachment.category || 'Clinical Document'}
                                    </span>
                                  </div>
                                </div>
                                <a
                                  href={msg.recordAttachment.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`px-2 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition ${
                                    isMe
                                      ? 'bg-white/20 hover:bg-white/30 text-white'
                                      : 'bg-trust-600 hover:bg-trust-700 text-white'
                                  }`}
                                >
                                  <span>View</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}

                            <div
                              className={`flex items-center justify-end gap-1 text-[10px] ${
                                isMe ? 'text-trust-100' : 'text-slate-400'
                              }`}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              <span>
                                {msg.createdAt
                                  ? new Date(msg.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attached record preview strip */}
                {selectedRecordAttachment && (
                  <div className="px-4 py-2 bg-trust-50 border-t border-trust-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-trust-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-trust-900 truncate">
                          Attaching: {selectedRecordAttachment.title}
                        </p>
                        <p className="text-[10px] text-trust-700">
                          {selectedRecordAttachment.category} • Ready for doctor review
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRecordAttachment(null)}
                      className="p-1 rounded-lg hover:bg-trust-200 text-trust-700"
                      title="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Message Input Form */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
                >
                  {!isDoctor && (
                    <button
                      type="button"
                      onClick={() => setIsRecordPickerOpen(true)}
                      className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                      title="Attach medical record from vault"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                  )}

                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={
                      isDoctor
                        ? 'Type clinical advice, prescriptions, or answers...'
                        : 'Ask doctor about symptoms, medication, or reports...'
                    }
                    className="flex-1 py-2.5 px-4 text-xs sm:text-sm bg-slate-100/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-500"
                  />

                  <button
                    type="submit"
                    disabled={(!messageInput.trim() && !selectedRecordAttachment) || sending}
                    className="px-4 py-2.5 rounded-xl bg-trust-600 hover:bg-trust-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition active:scale-95 shadow-sm shadow-trust-600/30"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            ) : (
              /* Empty state when no chat is selected */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-trust-50 text-trust-600 flex items-center justify-center border border-trust-100 shadow-sm">
                  <Stethoscope className="w-8 h-8" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-lg font-bold text-navy-900">
                    {isDoctor
                      ? 'Select a Patient Conversation'
                      : 'Consult with Certified Doctors'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {isDoctor
                      ? 'Choose an active patient inquiry from the left to view clinical history, lab reports, and respond.'
                      : 'Select an existing conversation or browse our directory of verified physicians to start a consultation.'}
                  </p>
                </div>

                {!isDoctor && (
                  <button
                    onClick={() => setActiveTab('doctors')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-trust-600 hover:bg-trust-700 text-white font-bold text-xs transition shadow-sm shadow-trust-600/30"
                  >
                    <Search className="w-4 h-4" />
                    <span>Browse Certified Doctors</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Record Picker Modal for Patients */}
      {isRecordPickerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-navy-900">Attach Health Record</h3>
                <p className="text-xs text-slate-500">
                  Select a document from your vault to share with the doctor
                </p>
              </div>
              <button
                onClick={() => setIsRecordPickerOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {myRecords.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No records uploaded in your vault yet.
                </div>
              ) : (
                myRecords.map((rec) => (
                  <div
                    key={rec._id}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-trust-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-navy-900 truncate">{rec.title}</p>
                        <p className="text-[10px] text-slate-400">
                          {rec.category} •{' '}
                          {rec.uploadDate ? new Date(rec.uploadDate).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecordAttachment(rec);
                        setIsRecordPickerOpen(false);
                        toast.info('Record Attached', `Ready to send "${rec.title}"`);
                      }}
                      className="px-3 py-1 rounded-lg bg-trust-600 hover:bg-trust-700 text-white text-xs font-bold"
                    >
                      Attach
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Patient Vitals Quick Modal for Doctors */}
      {isPatientInfoModalOpen && counterpart && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-trust-50 text-trust-600 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy-900">{counterpart.name}</h3>
                  <p className="text-[11px] text-slate-500">{counterpart.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPatientInfoModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Blood Group</span>
                <span className="font-bold text-red-600">
                  {counterpart.bloodGroup ? `🩸 ${counterpart.bloodGroup}` : 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Age</span>
                <span className="font-bold text-navy-900">
                  {counterpart.age ? `${counterpart.age} yrs` : 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Documented Allergies</span>
                {counterpart.allergies?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {counterpart.allergies.map((a) => (
                      <span
                        key={a}
                        className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold"
                      >
                        ⚠ {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">No allergies recorded</span>
                )}
              </div>

              {counterpart.emergencyContacts?.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 block mb-1">Emergency Contacts</span>
                  {counterpart.emergencyContacts.map((c, i) => (
                    <p key={i} className="text-[11px] font-medium text-slate-700">
                      {c.name} ({c.relationship}) : {c.phone}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsPatientInfoModalOpen(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Appointment Booking Modal */}
      <BookAppointmentModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedDoctorForBooking(null);
        }}
        doctor={selectedDoctorForBooking}
        onBookingSuccess={() => {
          fetchAppointments();
          fetchConsultations();
        }}
      />

      {/* Doctor Schedule & Availability Modal */}
      <DoctorScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onScheduleUpdated={(updated) => {
          setDoctorAvailability(updated);
          fetchDoctors();
        }}
      />

      {/* Doctor-Only Patient PranaSetu QR Scanner Modal */}
      {isDoctor && (
        <DoctorPatientScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onPatientAdmitted={async (consultation) => {
            setActiveTab('chats');
            await fetchConsultations(consultation._id);
            setActiveConsultation(consultation);
            if (consultation._id) {
              await fetchMessages(consultation._id);
            }
          }}
        />
      )}

      {/* Patient Doctor Registration QR Modal */}
      {!isDoctor && (
        <PatientConsultationQRModal
          isOpen={isPatientQRModalOpen}
          onClose={() => setIsPatientQRModalOpen(false)}
        />
      )}
    </div>
  );
}
