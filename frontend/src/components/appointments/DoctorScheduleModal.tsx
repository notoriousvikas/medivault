import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  RefreshCw,
  Power,
} from 'lucide-react';
import { appointmentsApi } from '../../api/appointments';
import { useToast } from '../../context/ToastContext';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

interface DoctorScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleUpdated?: (data: any) => void;
}

export default function DoctorScheduleModal({
  isOpen,
  onClose,
  onScheduleUpdated,
}: DoctorScheduleModalProps) {
  const toast = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [selectedDays, setSelectedDays] = useState<string[]>([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
  ]);
  const [consultationFee, setConsultationFee] = useState<number | string>(500);
  const [hospitalOrClinic, setHospitalOrClinic] = useState<string>('AyuRaksha Medical Center');

  useEffect(() => {
    if (!isOpen) return;

    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const res = await appointmentsApi.getDoctorAvailability();
        const doc = res.data;
        if (doc) {
          setIsAvailable(doc.isAvailableForBooking !== false);
          if (doc.workingHours?.start) setStartTime(doc.workingHours.start);
          if (doc.workingHours?.end) setEndTime(doc.workingHours.end);
          if (doc.workingDays?.length) setSelectedDays(doc.workingDays);
          if (doc.consultationFee !== undefined) setConsultationFee(doc.consultationFee);
          if (doc.hospitalOrClinic) setHospitalOrClinic(doc.hospitalOrClinic);
        }
      } catch (err: any) {
        console.warn('Could not fetch doctor schedule:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) {
        toast.error('Schedule Requirement', 'You must select at least one active working day.');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await appointmentsApi.updateDoctorAvailability({
        isAvailableForBooking: isAvailable,
        workingHours: { start: startTime, end: endTime },
        workingDays: selectedDays,
        consultationFee: Number(consultationFee),
        hospitalOrClinic,
      });

      toast.success(
        'Schedule Updated',
        `Your clinic hours and availability are now synchronized (${isAvailable ? 'Available' : 'Away'}).`
      );

      if (onScheduleUpdated) onScheduleUpdated(res.data);
      onClose();
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not save schedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-trust-50 text-trust-600 flex items-center justify-center border border-trust-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-navy-900">Doctor Schedule & Availability</h3>
              <p className="text-xs text-slate-500">Configure your active consultation hours and booking status</p>
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
          <div className="py-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-trust-600" />
            <p className="text-xs">Loading your schedule...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            {/* Live Availability Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                  <Power className={`w-3.5 h-3.5 ${isAvailable ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span>Accepting Appointments</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  {isAvailable
                    ? 'Patients and AI emergency triage can schedule consultations with you.'
                    : 'You will appear as Away/Unavailable. No new appointments will be booked.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAvailable(!isAvailable)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isAvailable ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Working Hours */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600"
                  required
                />
              </div>
            </div>

            {/* Working Days */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Available Working Days
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((day) => {
                  const active = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                        active
                          ? 'bg-trust-600 text-white border-trust-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fee & Clinic */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Consultation Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Hospital / Clinic
                </label>
                <input
                  type="text"
                  value={hospitalOrClinic}
                  onChange={(e) => setHospitalOrClinic(e.target.value)}
                  placeholder="e.g. City Hospital"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
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
                className="px-5 py-2.5 rounded-xl bg-trust-600 text-white text-xs font-bold hover:bg-trust-700 transition shadow-md shadow-trust-600/20 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Schedule</span>
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
