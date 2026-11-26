import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import { adminApi } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import NotFoundPage from './NotFoundPage';
import {
  Users,
  Stethoscope,
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Pill,
  Search,
  Trash2,
  Clock,
  Radio,
} from 'lucide-react';
import AreaHealthMonitoringView from '../components/dashboard/AreaHealthMonitoringView';
import { User } from '../types';

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const toast = useToast();

  const [overview, setOverview] = useState<any>(null);
  const [pendingDoctors, setPendingDoctors] = useState<User[]>([]);
  const [allDoctors, setAllDoctors] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending-doctors' | 'all-doctors' | 'users' | 'area-alerts'>('pending-doctors');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [doctorStatusFilter, setDoctorStatusFilter] = useState('all');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [ovRes, docRes, allDocsRes, usrRes] = await Promise.allSettled([
        adminApi.getOverview(),
        adminApi.getPendingDoctors(),
        adminApi.getAllDoctors(),
        adminApi.getAllUsers(),
      ]);

      if (ovRes.status === 'fulfilled' && ovRes.value?.data) {
        setOverview(ovRes.value.data);
      }
      if (docRes.status === 'fulfilled') {
        const docs = Array.isArray(docRes.value?.data)
          ? docRes.value.data
          : Array.isArray(docRes.value)
          ? docRes.value
          : [];
        setPendingDoctors(docs);
      }
      if (allDocsRes.status === 'fulfilled') {
        const docs = Array.isArray(allDocsRes.value?.data)
          ? allDocsRes.value.data
          : Array.isArray(allDocsRes.value)
          ? allDocsRes.value
          : [];
        setAllDoctors(docs);
      }
      if (usrRes.status === 'fulfilled') {
        const userList = Array.isArray(usrRes.value?.data)
          ? usrRes.value.data
          : Array.isArray(usrRes.value)
          ? usrRes.value
          : [];
        setUsers(userList);
      }
    } catch (err: any) {
      console.warn('Could not load admin stats from server:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAdminData();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-10 h-10 border-4 border-trust-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500 tracking-wide uppercase">
          Loading...
        </p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <NotFoundPage />;
  }

  const handleVerifyDoctor = async (doctorId: string, status: string) => {
    setProcessingId(doctorId);
    try {
      await adminApi.verifyDoctor(doctorId, status, `Verified by admin ${user?.email || 'admin@ayuraksha.io'}`);
      toast.success(
        status === 'verified' ? 'Doctor Verified' : 'Doctor Status Updated',
        `Physician credentials have been updated to "${status}".`
      );
      setPendingDoctors((prev) => prev.filter((d) => d._id !== doctorId));
      fetchAdminData();
    } catch (err: any) {
      toast.error('Verification Error', err.message || 'Could not update physician status.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    setProcessingId(userId);
    try {
      await adminApi.updateUserRole(userId, newRole);
      toast.success('Role Updated', `User permissions updated to "${newRole}".`);
      fetchAdminData();
    } catch (err: any) {
      toast.error('Role Update Failed', err.message || 'Could not update user role.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName?: string) => {
    if (!window.confirm(`Are you sure you want to remove user "${userName || userId}"? This cannot be undone.`)) {
      return;
    }
    setProcessingId(userId);
    try {
      await adminApi.deleteUser(userId);
      toast.success('User Removed', `Account deleted from platform.`);
      fetchAdminData();
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not remove user account.');
    } finally {
      setProcessingId(null);
    }
  };

  const stats = overview?.stats || {
    users: { total: users.length, patients: 0, doctors: 0 },
    doctorVerification: { pending: pendingDoctors.length, verified: 0, rejected: 0 },
    content: { records: 0, prescriptions: 0, timelineEvents: 0 },
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesSearch =
      !userSearch ||
      (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const filteredDoctors = allDoctors.filter((doc) => {
    if (doctorStatusFilter === 'all') return true;
    if (doctorStatusFilter === 'verified') return doc.isVerified || doc.verificationStatus === 'verified';
    if (doctorStatusFilter === 'pending') return doc.verificationStatus === 'pending' || (!doc.isVerified && doc.verificationStatus !== 'rejected');
    if (doctorStatusFilter === 'rejected') return doc.verificationStatus === 'rejected';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
                AyuRaksha System Administration
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-trust-100 text-trust-800 border border-trust-200">
                Super Admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Physician credentialing, clinical licensing verification, and decentralized EHR audit trails
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 active:scale-95 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-trust-600' : ''}`} />
              <span>{loading ? 'Syncing...' : 'Refresh Live Data'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Vault Users</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-trust-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-navy-900">{stats.users?.total ?? users.length}</div>
            <div className="text-xs text-slate-500 font-medium">
              {stats.users?.patients || 0} Patients &bull; {stats.users?.doctors || 0} Doctors
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Doctor Verifications</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-amber-600">
              {stats.doctorVerification?.pending ?? pendingDoctors.length}
            </div>
            <div className="text-xs text-amber-600 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{stats.doctorVerification?.verified || 0} Verified &bull; Requires License Audit</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Encrypted Records</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-trust-600">
              {stats.content?.records ?? stats.records?.total ?? 0}
            </div>
            <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>AES-256 Cloudinary Vault Active</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Prescriptions & Rx</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Pill className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-indigo-600">
              {stats.content?.prescriptions ?? stats.prescriptions?.total ?? 0}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              AI Drug Safety & Interaction Monitored
            </div>
          </div>

        </div>

        <div className="flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pending-doctors')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition ${
              activeTab === 'pending-doctors'
                ? 'border-trust-600 text-trust-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Approvals</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-bold">
              {pendingDoctors.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all-doctors')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition ${
              activeTab === 'all-doctors'
                ? 'border-trust-600 text-trust-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>All Physicians</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-bold">
              {allDoctors.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition ${
              activeTab === 'users'
                ? 'border-trust-600 text-trust-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Platform User Directory</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-bold">
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('area-alerts')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition ${
              activeTab === 'area-alerts'
                ? 'border-trust-600 text-trust-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Radio className="w-4 h-4 text-rose-500" />
            <span>Jagruti Alerts & Clusters</span>
          </button>
        </div>

        {activeTab === 'pending-doctors' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-base text-navy-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-trust-600" />
                  <span>Doctor Verification Queue</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Review and validate state medical council registration numbers before granting prescription write access
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {pendingDoctors.length} physician{pendingDoctors.length === 1 ? '' : 's'} awaiting review
              </span>
            </div>

            {pendingDoctors.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">All Physician Applications Cleared</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  There are no pending doctor registration requests waiting for state board license verification.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="pb-3">Doctor Name</th>
                      <th className="pb-3">Email Address</th>
                      <th className="pb-3">Specialization</th>
                      <th className="pb-3">License / Registration #</th>
                      <th className="pb-3">Clinic / Hospital</th>
                      <th className="pb-3 text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingDoctors.map((doc) => {
                      const docId = doc._id || doc.id || '';
                      return (
                        <tr key={docId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 font-bold text-navy-900 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
                              {doc.name ? doc.name[0].toUpperCase() : 'D'}
                            </div>
                            <span>Dr. {doc.name}</span>
                          </td>
                          <td className="py-3.5 text-slate-600 font-mono text-[11px]">{doc.email}</td>
                          <td className="py-3.5">
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                              {doc.specialization || 'General Practice'}
                            </span>
                          </td>
                          <td className="py-3.5 text-trust-700 font-mono font-bold">
                            {doc.licenseNumber || 'Not provided'}
                          </td>
                          <td className="py-3.5 text-slate-500">
                            {doc.hospitalOrClinic || 'AyuRaksha Medical Center'}
                          </td>
                          <td className="py-3.5 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleVerifyDoctor(docId, 'verified')}
                              disabled={processingId === docId}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerifyDoctor(docId, 'rejected')}
                              disabled={processingId === docId}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] hover:bg-rose-100 active:scale-95 transition disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'all-doctors' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-base text-navy-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-indigo-600" />
                  <span>All Registered Physicians ({allDoctors.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Full registry of clinical practitioners on the platform
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                {['all', 'verified', 'pending', 'rejected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setDoctorStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg capitalize transition ${
                      doctorStatusFilter === st
                        ? 'bg-white text-navy-900 shadow-sm'
                        : 'text-slate-600 hover:text-navy-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Physician</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Specialization</th>
                    <th className="pb-3">License #</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDoctors.map((doc) => {
                    const docId = doc._id || doc.id || '';
                    const isDocVerified = doc.isVerified || doc.verificationStatus === 'verified';
                    const isDocRejected = doc.verificationStatus === 'rejected';

                    return (
                      <tr key={docId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 font-bold text-navy-900">Dr. {doc.name}</td>
                        <td className="py-3.5 text-slate-600 font-mono text-[11px]">{doc.email}</td>
                        <td className="py-3.5 text-slate-700">{doc.specialization || 'General Medicine'}</td>
                        <td className="py-3.5 text-slate-600 font-mono">{doc.licenseNumber || 'None'}</td>
                        <td className="py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isDocVerified
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isDocRejected
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {isDocVerified ? 'Verified' : isDocRejected ? 'Rejected' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3.5 text-right space-x-1.5">
                          {!isDocVerified ? (
                            <button
                              type="button"
                              onClick={() => handleVerifyDoctor(docId, 'verified')}
                              disabled={processingId === docId}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-[10px] transition"
                            >
                              Approve
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleVerifyDoctor(docId, 'rejected')}
                              disabled={processingId === docId}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold text-[10px] transition"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-base text-navy-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>Platform User Directory ({filteredUsers.length} / {users.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Global account governance, role adjustments, and emergency tokens
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search name or email..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition w-48 sm:w-56"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                  {['all', 'patient', 'doctor', 'admin'].map((role) => (
                    <button
                      key={role}
                      onClick={() => setUserRoleFilter(role)}
                      className={`px-2.5 py-1 rounded-lg capitalize text-[11px] transition ${
                        userRoleFilter === role
                          ? 'bg-white text-navy-900 shadow-sm'
                          : 'text-slate-600 hover:text-navy-900'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Emergency QR Token</th>
                    <th className="pb-3">Account Status</th>
                    <th className="pb-3 text-right">Governance Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const uId = u._id || u.id || '';
                    return (
                      <tr key={uId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 font-bold text-navy-900">{u.name}</td>
                        <td className="py-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                        <td className="py-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(uId, e.target.value)}
                            disabled={processingId === uId}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-trust-500"
                          >
                            <option value="patient">Patient</option>
                            <option value="doctor">Doctor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-3 font-mono text-slate-400 text-[11px]">
                          {u.emergencyToken ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                              {u.emergencyToken.slice(0, 8)}...
                            </span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              u.isVerified || u.verificationStatus === 'verified'
                                ? 'bg-emerald-50 text-emerald-700'
                                : u.verificationStatus === 'pending'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {u.verificationStatus || (u.isVerified ? 'verified' : 'active')}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(uId, u.name)}
                            disabled={processingId === uId}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete user account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'area-alerts' && (
          <AreaHealthMonitoringView />
        )}

      </main>
    </div>
  );
}
