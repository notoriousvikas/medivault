import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import { adminApi } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ShieldCheck,
  Users,
  Stethoscope,
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Lock,
  Pill
} from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [overview, setOverview] = useState(null);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [ovRes, docRes, usrRes] = await Promise.allSettled([
        adminApi.getOverview(),
        adminApi.getPendingDoctors(),
        adminApi.getAllUsers(),
      ]);

      if (ovRes.status === 'fulfilled' && ovRes.value?.data) {
        setOverview(ovRes.value.data);
      }
      if (docRes.status === 'fulfilled' && docRes.value?.data) {
        setPendingDoctors(docRes.value.data);
      }
      if (usrRes.status === 'fulfilled' && usrRes.value?.data) {
        setUsers(usrRes.value.data);
      }
    } catch (err) {
      console.warn('Could not load admin stats:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleVerifyDoctor = async (doctorId, status) => {
    setProcessingId(doctorId);
    try {
      await adminApi.verifyDoctor(doctorId, status, `Verified by admin ${user?.email || ''}`);
      toast.success(
        status === 'verified' ? 'Doctor Verified' : 'Doctor Rejected',
        `Physician credentials have been updated.`
      );
      setPendingDoctors((prev) => prev.filter((d) => d._id !== doctorId));
      fetchAdminData();
    } catch (err) {
      toast.error('Verification Error', err.message || 'Could not verify physician.');
    } finally {
      setProcessingId(null);
    }
  };

  const stats = overview?.stats || {
    users: { total: users.length, patients: 0, doctors: 0 },
    doctorVerification: { pending: pendingDoctors.length, verified: 0 },
    records: { total: 0 },
    prescriptions: { total: 0 },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
                MediVault System Administration
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-trust-100 text-trust-800">
                Super Admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Platform governance, physician credential verification, and encrypted EHR audit trails
            </p>
          </div>

          <button
            onClick={fetchAdminData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* System Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase text-slate-400">Total Vault Users</span>
            <div className="text-3xl font-extrabold text-navy-900 mt-2">{stats.users?.total || 0}</div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.users?.patients || 0} Patients • {stats.users?.doctors || 0} Doctors
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase text-slate-400">Pending Doctors</span>
            <div className="text-3xl font-extrabold text-amber-600 mt-2">
              {stats.doctorVerification?.pending || pendingDoctors.length}
            </div>
            <div className="text-xs text-amber-600 font-medium mt-1">Requires License Validation</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase text-slate-400">Encrypted Records</span>
            <div className="text-3xl font-extrabold text-trust-600 mt-2">{stats.records?.total || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Encrypted Vault Active</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase text-slate-400">Total Prescriptions</span>
            <div className="text-3xl font-extrabold text-emerald-600 mt-2">
              {stats.prescriptions?.total || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">Aarogya AI Safety Verified</div>
          </div>
        </div>

        {/* Doctor Verification Queue */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-navy-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-trust-600" />
                <span>Doctor Verification Queue</span>
              </h3>
              <p className="text-xs text-slate-500">
                Validate medical state board licenses before granting clinical write access
              </p>
            </div>
          </div>

          {pendingDoctors.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All physician credential applications have been reviewed and verified.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Doctor Name</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Specialization</th>
                    <th className="pb-3">License #</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingDoctors.map((doc) => (
                    <tr key={doc._id} className="hover:bg-slate-50">
                      <td className="py-3 font-bold text-navy-900">{doc.name}</td>
                      <td className="py-3 text-slate-600 font-mono text-[11px]">{doc.email}</td>
                      <td className="py-3 text-slate-700">{doc.specialization || 'General Practice'}</td>
                      <td className="py-3 text-trust-700 font-mono font-semibold">
                        {doc.licenseNumber || 'N/A'}
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleVerifyDoctor(doc._id, 'verified')}
                          disabled={processingId === doc._id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyDoctor(doc._id, 'rejected')}
                          disabled={processingId === doc._id}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] hover:bg-rose-100 transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Directory */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-navy-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Platform User Directory ({users.length})</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Emergency Token</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="py-3 font-bold text-navy-900">{u.name}</td>
                    <td className="py-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-400 text-[11px]">
                      {u.emergencyToken ? u.emergencyToken.slice(0, 12) + '...' : 'None'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.isVerified || u.verificationStatus === 'verified'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {u.verificationStatus || (u.isVerified ? 'verified' : 'active')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
