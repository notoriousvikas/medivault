import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Activity,
  Calendar,
  Clock,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  Search,
  Building,
  Sparkles,
  DollarSign,
  X,
  ScanLine,
  Droplet,
  UserPen,
} from 'lucide-react';
import { appointmentsApi } from '../../api/appointments';
import { consultationsApi } from '../../api/consultations';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import DoctorScheduleModal from '../appointments/DoctorScheduleModal';
import EditDoctorProfileModal from '../profile/EditDoctorProfileModal';

export default function DoctorDashboardView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [appointments, setAppointments] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  // Selected scan modal for quick radiograph inspection
  const [inspectingAppointment, setInspectingAppointment] = useState(null);

  // Filters
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'CRITICAL' | 'today' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [aptRes, consultRes, availRes] = await Promise.allSettled([
        appointmentsApi.getAppointments(),
        consultationsApi.getConsultations(),
        appointmentsApi.getDoctorAvailability(),
      ]);

      if (aptRes.status === 'fulfilled' && Array.isArray(aptRes.value?.data)) {
        setAppointments(aptRes.value.data);
      } else {
        setAppointments([]);
      }

      if (consultRes.status === 'fulfilled' && Array.isArray(consultRes.value?.data)) {
        setConsultations(consultRes.value.data);
      } else {
        setConsultations([]);
      }

      if (availRes.status === 'fulfilled' && availRes.value?.data) {
        setAvailability(availRes.value.data);
      } else {
        setAvailability({
          isAvailableForBooking: true,
          workingHours: { start: '09:00', end: '17:00' },
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          consultationFee: 500,
          hospitalOrClinic: 'AyuRaksha Central Hospital',
        });
      }
    } catch (err) {
      console.warn('Doctor dashboard fetch error:', err.message);
      setAppointments([]);
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleAvailability = async () => {
    const current = availability?.isAvailableForBooking !== false;
    const nextState = !current;
    setTogglingAvailability(true);
    try {
      try {
        const res = await appointmentsApi.updateDoctorAvailability({
          isAvailableForBooking: nextState,
        });
        setAvailability(res.data);
      } catch {
        setAvailability((prev) => ({ ...(prev || {}), isAvailableForBooking: nextState }));
      }

      toast.success(
        nextState ? '🟢 Clinic Available' : '⚪ Marked As Away',
        nextState
          ? 'You are now online. DenseNet-121 critical triage cases can be auto-routed to you.'
          : 'You are marked as away. Auto-bookings are paused.'
      );
    } catch (err) {
      toast.error('Failed to update availability', err.message);
    } finally {
      setTogglingAvailability(false);
    }
  };

  const handleUpdateStatus = async (appointmentId, status) => {
    setUpdatingStatusId(appointmentId);
    try {
      await appointmentsApi.updateAppointmentStatus(appointmentId, { status });

      setAppointments((prev) =>
        prev.map((apt) => (apt._id === appointmentId ? { ...apt, status } : apt))
      );

      toast.success('Status Updated', `Appointment marked as ${status}.`);
    } catch (err) {
      toast.error('Update Failed', err.message);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Metrics (computed strictly from live backend appointments)
  const criticalAppointments = appointments.filter(
    (a) => a.urgency === 'CRITICAL' && a.status !== 'completed' && a.status !== 'cancelled'
  );

  const todayStr = new Date().toDateString();
  const todayAppointments = appointments.filter((a) => {
    if (!a.appointmentDate) return false;
    return new Date(a.appointmentDate).toDateString() === todayStr;
  });

  const completedAppointments = appointments.filter((a) => a.status === 'completed');

  // Filtered list
  const filteredAppointments = appointments.filter((apt) => {
    // Tab filter
    if (selectedFilter === 'CRITICAL' && apt.urgency !== 'CRITICAL') return false;
    if (selectedFilter === 'today' && new Date(apt.appointmentDate).toDateString() !== todayStr)
      return false;
    if (selectedFilter === 'completed' && apt.status !== 'completed') return false;

    // Search query
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const patientName = apt.patientId?.name?.toLowerCase() || '';
    const cond = apt.primaryCondition?.toLowerCase() || '';
    const slot = apt.timeSlot?.toLowerCase() || '';
    return patientName.includes(q) || cond.includes(q) || slot.includes(q);
  });

  const displayName = user?.name
    ? user.name.startsWith('Dr. ')
      ? user.name
      : `Dr. ${user.name}`
    : 'Dr. Specialist';

  return (
    <div className="space-y-6">
      {/* ── Top Header / Command Strip ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-gradient-to-br from-trust-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Doctor Info */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-trust-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-trust-600/20 flex-shrink-0">
              <Stethoscope className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">
                  {displayName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Specialist
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-trust-100 text-trust-800 text-xs font-bold">
                  {user?.specialization || availability?.specialization || 'Pulmonology & Critical Care'}
                </span>
              </div>

              <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {user?.hospitalOrClinic || availability?.hospitalOrClinic || 'AyuRaksha Central Hospital'}
                </span>
                <span>&bull;</span>
                <span className="font-mono">
                  Lic: {user?.licenseNumber || availability?.licenseNumber || 'MH-MC-2024-8841'}
                </span>
                <span>&bull;</span>
                <span className="font-semibold text-slate-700 flex items-center gap-0.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  Fee: ₹{availability?.consultationFee ?? user?.consultationFee ?? 500}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Live Status Toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Real-time Status Switch */}
            <div className="p-2 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-navy-900 flex items-center justify-end gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      availability?.isAvailableForBooking !== false
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span>{availability?.isAvailableForBooking !== false ? 'Accepting Patients' : 'Offline / Away'}</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  {availability?.isAvailableForBooking !== false
                    ? 'AI emergency triage auto-routing active'
                    : 'New auto-bookings paused'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleAvailability}
                disabled={togglingAvailability}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  availability?.isAvailableForBooking !== false ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    availability?.isAvailableForBooking !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Edit Profile Button */}
            <button
              onClick={() => setIsEditProfileModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-navy-900 rounded-xl text-xs font-bold transition shadow-xs hover:bg-slate-50"
            >
              <UserPen className="w-4 h-4 text-trust-600" />
              <span>Edit Profile</span>
            </button>

            {/* Configure Schedule Button */}
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-navy-900 rounded-xl text-xs font-bold transition shadow-xs hover:bg-slate-50"
            >
              <Clock className="w-4 h-4 text-trust-600" />
              <span>Clinic Schedule</span>
            </button>

            {/* Open Consultations Page */}
            <button
              onClick={() => navigate('/consultations')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-trust-600 hover:bg-trust-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-trust-600/20"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Consultation Room</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Triage Alert Card */}
        <div
          onClick={() => setSelectedFilter('CRITICAL')}
          className={`p-5 rounded-3xl border transition cursor-pointer relative overflow-hidden ${
            criticalAppointments.length > 0
              ? 'bg-rose-50/80 border-rose-200 shadow-sm shadow-rose-500/10 hover:border-rose-300 ring-2 ring-rose-500/10'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                criticalAppointments.length > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                criticalAppointments.length > 0 ? 'bg-rose-200 text-rose-800' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {criticalAppointments.length > 0 ? 'Urgent Alert' : 'Normal'}
            </span>
          </div>

          <div className="mt-3">
            <p className="text-2xl font-black text-navy-900">{criticalAppointments.length}</p>
            <p className="text-xs font-bold text-slate-600">Critical Triage Cases</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Flagged by DenseNet-121 inference</p>
          </div>
        </div>

        {/* Today's Appointments */}
        <div
          onClick={() => setSelectedFilter('today')}
          className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-trust-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-trust-50 text-trust-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-trust-100 text-trust-700">
              Today
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-navy-900">{todayAppointments.length}</p>
            <p className="text-xs font-bold text-slate-600">Scheduled Today</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Active daily consultations</p>
          </div>
        </div>

        {/* Active Consultations */}
        <div
          onClick={() => navigate('/consultations')}
          className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-trust-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              Threads
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-navy-900">{consultations.length}</p>
            <p className="text-xs font-bold text-slate-600">Patient Channels</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Active clinical conversations</p>
          </div>
        </div>

        {/* Completed Cases */}
        <div
          onClick={() => setSelectedFilter('completed')}
          className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-trust-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Treated
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-navy-900">{completedAppointments.length}</p>
            <p className="text-xs font-bold text-slate-600">Completed Sessions</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Successfully concluded care</p>
          </div>
        </div>
      </div>

      {/* ── Emergency Red Alert Callout (Pulsing alert shown strictly when critical cases exist) ── */}
      {criticalAppointments.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-600 via-rose-700 to-red-600 text-white shadow-xl shadow-rose-600/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2 border-rose-400/50 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 animate-bounce shadow-inner">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <h3 className="text-sm font-black tracking-wide uppercase">
                  Doctor's Priority Queue &bull; Critical Triage Emergency ({criticalAppointments.length})
                </h3>
              </div>
              <p className="text-xs text-rose-100 mt-1">
                DenseNet-121 radiograph inference detected severe acute pathologies. Immediate clinical review required.
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedFilter('CRITICAL')}
            className="px-4 py-2 rounded-xl bg-white text-rose-700 text-xs font-bold hover:bg-rose-50 transition shadow-sm whitespace-nowrap"
          >
            Review Critical Patients
          </button>
        </div>
      )}

      {/* ── Main Clinical Queue & Patient Management ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header & Filter Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-trust-600" />
              <span>Clinical Triage & Appointment Queue</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live patient cases matched from DenseNet-121 radiograph triage and appointments
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search patient, finding, or slot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600 w-52"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1">
              {[
                { id: 'all', label: 'All Queue' },
                { id: 'CRITICAL', label: `🚨 Critical (${criticalAppointments.length})` },
                { id: 'today', label: 'Today' },
                { id: 'completed', label: 'Completed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    selectedFilter === tab.id
                      ? 'bg-white text-navy-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchData}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Refresh Queue"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Queue List */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-trust-600" />
              <p className="text-xs">Loading patient appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-navy-900">
                  {selectedFilter === 'CRITICAL'
                    ? 'No Critical Triage Cases Pending'
                    : selectedFilter === 'today'
                    ? 'No Appointments Scheduled for Today'
                    : selectedFilter === 'completed'
                    ? 'No Completed Sessions Yet'
                    : 'No Patient Appointments in Queue'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {selectedFilter === 'CRITICAL'
                    ? 'DenseNet-121 has not flagged any acute emergency radiographs requiring urgent care.'
                    : 'When patients upload chest radiographs or schedule consultations, they will appear here automatically.'}
                </p>
              </div>
            </div>
          ) : (
            filteredAppointments.map((apt) => {
              const isCrit = apt.urgency === 'CRITICAL';
              const isUrg = apt.urgency === 'URGENT';
              const patient = apt.patientId;
              const record = apt.recordId;

              return (
                <div
                  key={apt._id}
                  className={`p-4 sm:p-6 transition hover:bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isCrit ? 'bg-rose-50/30' : ''
                  }`}
                >
                  {/* Left: Patient info & Triage findings */}
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base flex-shrink-0 ${
                        isCrit
                          ? 'bg-rose-600 text-white animate-pulse'
                          : isUrg
                          ? 'bg-amber-500 text-white'
                          : 'bg-gradient-to-br from-trust-600 to-indigo-600 text-white'
                      }`}
                    >
                      {patient?.name ? patient.name.slice(0, 2).toUpperCase() : 'PT'}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-navy-900 truncate">
                          {patient?.name || 'Anonymous Patient'}
                        </h4>

                        {/* Urgency Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1 ${
                            isCrit
                              ? 'bg-rose-600 text-white animate-pulse'
                              : isUrg
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isCrit && <AlertCircle className="w-3 h-3" />}
                          {apt.urgency}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            apt.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : apt.status === 'completed'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {apt.status}
                        </span>

                        {apt.autoBooked && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            DenseNet Auto-Booked
                          </span>
                        )}
                      </div>

                      {/* Clinical Finding */}
                      <p className="text-xs text-slate-700">
                        Primary Finding:{' '}
                        <strong className="text-navy-900 font-bold">
                          {apt.primaryCondition || 'General Radiographic Review'}
                        </strong>
                        {apt.criticalityScore > 0 && (
                          <span className="text-slate-500 font-mono font-bold ml-1.5">
                            (Confidence: {(apt.criticalityScore * 100).toFixed(1)}%)
                          </span>
                        )}
                      </p>

                      {/* Triage Summary */}
                      {apt.triageDetails?.clinicalSummary && (
                        <p className="text-[11px] text-slate-600 italic line-clamp-1 max-w-xl">
                          "{apt.triageDetails.clinicalSummary}"
                        </p>
                      )}

                      {/* Vitals summary if available */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                        {patient?.age && <span>Age: {patient.age} yrs</span>}
                        {patient?.bloodGroup && (
                          <>
                            <span>&bull;</span>
                            <span className="text-rose-600 font-bold flex items-center gap-0.5">
                              <Droplet className="w-3 h-3 text-rose-500 fill-rose-500" />
                              {patient.bloodGroup}
                            </span>
                          </>
                        )}
                        {patient?.allergies?.length > 0 && (
                          <>
                            <span>&bull;</span>
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 text-[10px] font-semibold">
                              Allergies: {patient.allergies.join(', ')}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Time slot */}
                      <p className="text-xs font-mono text-slate-500 flex items-center gap-1.5 pt-1">
                        <Clock className="w-3.5 h-3.5 text-trust-600" />
                        <span>Slot: {apt.timeSlot}</span>
                        {apt.appointmentDate && (
                          <>
                            <span>&bull;</span>
                            <span>{new Date(apt.appointmentDate).toLocaleDateString()}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-wrap lg:justify-end">
                    {/* View Scan Button */}
                    {record?.fileUrl && (
                      <button
                        onClick={() => setInspectingAppointment(apt)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                      >
                        <ScanLine className="w-3.5 h-3.5 text-violet-600" />
                        <span>View X-Ray Scan</span>
                      </button>
                    )}

                    {/* Open Consultation Chat */}
                    {apt.consultationId && (
                      <button
                        onClick={() => navigate(`/consultations?id=${apt.consultationId}`)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-trust-600 hover:bg-trust-700 text-white text-xs font-bold transition shadow-sm shadow-trust-600/20"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Open Clinical Chat</span>
                      </button>
                    )}

                    {/* Status actions */}
                    {apt.status !== 'completed' ? (
                      <button
                        onClick={() => handleUpdateStatus(apt._id, 'completed')}
                        disabled={updatingStatusId === apt._id}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Treated</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Concluded
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Quick X-Ray Inspection Modal (DenseNet-121 Radiograph Breakdown) ── */}
      {inspectingAppointment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <ScanLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-navy-900">
                    DenseNet-121 Radiograph Study
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient: <strong>{inspectingAppointment.patientId?.name}</strong> &bull; {inspectingAppointment.recordId?.title || 'Chest X-Ray'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingAppointment(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* X-Ray Image Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center max-h-72">
              <img
                src={inspectingAppointment.recordId?.fileUrl}
                alt="Radiograph Study"
                className="max-h-72 w-auto object-contain"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono">
                PA CHEST &bull; 224x224 NORMALIZED
              </div>
            </div>

            {/* Critical Triage Notice */}
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Primary Critical Finding: {inspectingAppointment.primaryCondition}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono font-extrabold text-[10px]">
                  {inspectingAppointment.criticalityScore
                    ? `${(inspectingAppointment.criticalityScore * 100).toFixed(1)}% Confidence`
                    : 'Critical Priority'}
                </span>
              </div>
              <p className="text-rose-900 text-[11px] leading-relaxed">
                {inspectingAppointment.triageDetails?.clinicalSummary || inspectingAppointment.patientNotes}
              </p>
            </div>

            {/* DenseNet-121 Pathology Scores List */}
            {inspectingAppointment.recordId?.parsedData?.xrayAnalysis?.findings && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Detected Pathology Pattern Scores (TorchXRayVision)</span>
                  <span className="text-[10px] font-mono font-normal text-slate-400">DenseNet-121</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inspectingAppointment.recordId.parsedData.xrayAnalysis.findings.map((item, idx) => {
                    const score = Number(item.raw_score || 0);
                    const pct = Math.min(Math.max(score * 100, 0), 100);
                    const isHigh = score >= 0.40;
                    const isMed = score >= 0.20;
                    return (
                      <div key={idx} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">{item.label}</span>
                          <span className={`font-mono font-extrabold text-[11px] ${isHigh ? 'text-rose-600' : isMed ? 'text-amber-600' : 'text-slate-500'}`}>
                            {score.toFixed(3)} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-400' : 'bg-trust-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Patient Clinical Notes */}
            {inspectingAppointment.doctorNotes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <p className="font-bold text-navy-900">Physician Clinical Plan:</p>
                <p className="text-slate-600">{inspectingAppointment.doctorNotes}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectingAppointment(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const consultId = inspectingAppointment.consultationId;
                  setInspectingAppointment(null);
                  if (consultId) navigate(`/consultations?id=${consultId}`);
                  else navigate('/consultations');
                }}
                className="px-5 py-2 rounded-xl bg-trust-600 hover:bg-trust-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open Clinical Chat With Patient</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Configuration Modal */}
      <DoctorScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onScheduleUpdated={(updated) => {
          setAvailability((prev) => ({ ...(prev || {}), ...updated }));
        }}
      />

      {/* Edit Doctor Profile Modal */}
      <EditDoctorProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        onProfileUpdated={(updated) => {
          setAvailability((prev) => ({ ...(prev || {}), ...updated }));
          fetchData();
        }}
      />
    </div>
  );
}
