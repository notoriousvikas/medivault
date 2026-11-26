import React, { useState, useEffect } from 'react';
import {
  X,
  Stethoscope,
  Building,
  Award,
  DollarSign,
  FileText,
  User,
  Save,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { authApi } from '../../api/auth';
import { appointmentsApi } from '../../api/appointments';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { User as UserType } from '../../types';

const SPECIALTY_OPTIONS = [
  'Pulmonology & Critical Care',
  'Pulmonology',
  'Cardiology',
  'Radiology & Medical Imaging',
  'General Medicine',
  'Emergency Medicine',
  'Critical Care Medicine',
  'Orthopedics',
  'Oncology',
  'Neurology',
  'Pediatrics',
  'Internal Medicine',
];

interface EditDoctorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (user: UserType) => void;
}

export default function EditDoctorProfileModal({
  isOpen,
  onClose,
  onProfileUpdated,
}: EditDoctorProfileModalProps) {
  const { user, updateUserData } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('Pulmonology & Critical Care');
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [hospitalOrClinic, setHospitalOrClinic] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [consultationFee, setConsultationFee] = useState<number | string>(500);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchCurrentData = async () => {
      setLoading(true);
      try {
        // Hydrate from user context first
        if (user) {
          setName(user.name || '');
          setHospitalOrClinic(user.hospitalOrClinic || 'AyuRaksha Central Hospital');
          setLicenseNumber(user.licenseNumber || '');
          setConsultationFee(user.consultationFee !== undefined ? user.consultationFee : 500);
          setBio(user.bio || '');

          const userSpec = user.specialization || 'Pulmonology & Critical Care';
          if (SPECIALTY_OPTIONS.includes(userSpec)) {
            setSpecialization(userSpec);
            setCustomSpecialty('');
          } else {
            setSpecialization('Other');
            setCustomSpecialty(userSpec);
          }
        }

        // Also fetch availability to get fresh settings
        const availRes = await appointmentsApi.getDoctorAvailability();
        if (availRes?.data) {
          const doc = availRes.data;
          if (doc.hospitalOrClinic) setHospitalOrClinic(doc.hospitalOrClinic);
          if (doc.consultationFee !== undefined) setConsultationFee(doc.consultationFee);
          if (doc.bio) setBio(doc.bio);
          if (doc.specialization && !user?.specialization) {
            if (SPECIALTY_OPTIONS.includes(doc.specialization)) {
              setSpecialization(doc.specialization);
            } else {
              setSpecialization('Other');
              setCustomSpecialty(doc.specialization);
            }
          }
        }
      } catch (err: any) {
        console.warn('Could not hydrate doctor details:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentData();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Validation Error', 'Doctor name is required.');
      return;
    }

    const finalSpecialty =
      specialization === 'Other' ? customSpecialty.trim() || 'General Medicine' : specialization;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        specialization: finalSpecialty,
        hospitalOrClinic: hospitalOrClinic.trim() || 'AyuRaksha Medical Center',
        licenseNumber: licenseNumber.trim(),
        consultationFee: Number(consultationFee) || 500,
        bio: bio.trim(),
      };

      const userId = user?._id || user?.id;
      let updatedUser: Partial<UserType> | null = null;

      // 1. Update user profile
      if (userId) {
        const res = await authApi.updateProfile(userId, payload);
        updatedUser = res.data || res.user || res;
      }

      // 2. Also keep appointment availability metadata synchronized
      try {
        await appointmentsApi.updateDoctorAvailability({
          hospitalOrClinic: payload.hospitalOrClinic,
          consultationFee: payload.consultationFee,
          bio: payload.bio,
        });
      } catch (syncErr: any) {
        console.warn('Availability sync warning:', syncErr.message);
      }

      // 3. Update global Auth state
      const merged: UserType = { ...(user || {}), ...payload, ...(updatedUser || {}) };
      updateUserData(merged);

      toast.success(
        'Profile Updated',
        'Your doctor profile and clinical credentials have been updated successfully.'
      );

      if (onProfileUpdated) {
        onProfileUpdated(merged);
      }

      onClose();
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      toast.error('Update Failed', err.message || 'Could not save doctor profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-trust-50 text-trust-600 flex items-center justify-center border border-trust-100">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-navy-900">Edit Doctor Profile</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Update your credentials, specialization, and hospital affiliation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-trust-600" />
            <p className="text-xs">Loading profile details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-trust-600" />
                <span>Full Name</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Dr.</span>
                <input
                  type="text"
                  required
                  value={name.startsWith('Dr. ') ? name.replace(/^Dr\.\s*/, '') : name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setName(val.startsWith('Dr. ') ? val : `Dr. ${val}`);
                  }}
                  placeholder="First and Last Name"
                  className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600 font-medium text-navy-900"
                />
              </div>
            </div>

            {/* Specialization & Custom */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-navy-900 mb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-trust-600" />
                <span>Medical Specialty</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600 font-medium text-navy-900 bg-white"
              >
                {SPECIALTY_OPTIONS.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
                <option value="Other">Other Specialty (Specify)</option>
              </select>

              {specialization === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter custom specialty (e.g. Thoracic Surgery)"
                  value={customSpecialty}
                  onChange={(e) => setCustomSpecialty(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600 font-medium text-navy-900"
                />
              )}
            </div>

            {/* Hospital / Clinic & License Number (2 cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-trust-600" />
                  <span>Hospital / Clinic Affiliation</span>
                </label>
                <input
                  type="text"
                  value={hospitalOrClinic}
                  onChange={(e) => setHospitalOrClinic(e.target.value)}
                  placeholder="AyuRaksha Central Hospital"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600 font-medium text-navy-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-trust-600" />
                  <span>Medical License Number</span>
                </label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="MH-MC-2024-8841"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600 font-mono text-navy-900"
                />
              </div>
            </div>

            {/* Consultation Fee */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-trust-600" />
                <span>Standard Consultation Fee (₹)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600 font-bold text-navy-900"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Displayed to patients during regular bookings and specialist referrals.
              </p>
            </div>

            {/* Bio / Clinical Summary */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-trust-600" />
                <span>Professional Bio & Clinical Focus</span>
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief summary of your clinical experience, specialties, and emergency trauma management..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600 text-slate-700 leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-trust-600 hover:bg-trust-700 text-white text-xs font-bold transition shadow-md shadow-trust-600/20 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
