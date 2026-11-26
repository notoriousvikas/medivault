import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { appointmentsApi } from '../../api/appointments';
import { useToast } from '../../context/ToastContext';
import { User as UserType, MedicalRecord } from '../../types';

interface SlotItem {
  slot: string;
  available: boolean;
}

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: UserType | null;
  record?: MedicalRecord | null;
  onBookingSuccess?: (data: any) => void;
}

export default function BookAppointmentModal({
  isOpen,
  onClose,
  doctor,
  record,
  onBookingSuccess,
}: BookAppointmentModalProps) {
  const toast = useToast();

  const [appointmentDate, setAppointmentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [urgency, setUrgency] = useState<string>('ROUTINE');
  const [patientNotes, setPatientNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const doctorId = doctor?._id || doctor?.id;
    if (!isOpen || !doctorId) return;

    let isMounted = true;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await appointmentsApi.getDoctorSlots(doctorId, appointmentDate);
        if (!isMounted) return;
        const slotList: SlotItem[] = res.data?.slots || [];
        setSlots(slotList);
        // Auto-select first available slot if currently selected slot isn't in available slots
        const firstAvail = slotList.find((s) => s.available);
        if (firstAvail) setSelectedSlot(firstAvail.slot);
        else setSelectedSlot('');
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('Failed to load slots:', err.message);
        setSlots([]);
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    };

    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [isOpen, doctor?._id, doctor?.id, appointmentDate]);

  if (!isOpen || !doctor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      toast.error('Slot Required', 'Please select an available appointment time slot.');
      return;
    }

    const doctorId = doctor?._id || doctor?.id;
    const recordId = record?._id || record?.id || record?.recordId;

    setSubmitting(true);
    try {
      const res = await appointmentsApi.createAppointment({
        doctorId,
        recordId: recordId || undefined,
        appointmentDate,
        timeSlot: selectedSlot,
        urgency,
        patientNotes,
      });

      toast.success(
        'Appointment Scheduled!',
        `Your consultation with Dr. ${doctor.name} is booked for ${selectedSlot}.`
      );

      if (onBookingSuccess) onBookingSuccess(res.data);
      onClose();
    } catch (err: any) {
      toast.error('Booking Failed', err.message || 'Could not schedule appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-trust-50 text-trust-600 flex items-center justify-center border border-trust-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-navy-900">Book Doctor Consultation</h3>
              <p className="text-xs text-slate-500">
                Dr. {doctor.name} &bull; {doctor.specialization || 'General Physician'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Doctor Info Card */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
          <div>
            <p className="font-bold text-navy-900">Dr. {doctor.name}</p>
            <p className="text-slate-500">{doctor.hospitalOrClinic || 'AyuRaksha Medical Center'}</p>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                doctor.isAvailableForBooking !== false
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  doctor.isAvailableForBooking !== false ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              {doctor.isAvailableForBooking !== false ? 'Accepting Patients' : 'Unavailable'}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Fee: ₹{doctor.consultationFee || 500}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Urgency Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Urgency Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { level: 'ROUTINE', label: 'Routine' },
                { level: 'URGENT', label: 'Urgent (24h)' },
                { level: 'CRITICAL', label: 'Critical' },
              ].map(({ level, label }) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setUrgency(level)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition text-center ${
                    urgency === level
                      ? level === 'CRITICAL'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : level === 'URGENT'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-trust-600 text-white border-trust-600 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Date
            </label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600"
              required
            />
          </div>

          {/* Time Slot Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Available Time Slots
              </label>
              {loadingSlots && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Checking slots...
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
              {slots.length === 0 && !loadingSlots ? (
                <p className="col-span-2 text-center text-xs text-slate-400 py-4">
                  No slots available on this date.
                </p>
              ) : (
                slots.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={!item.available}
                    onClick={() => setSelectedSlot(item.slot)}
                    className={`py-2 px-2.5 text-xs font-semibold rounded-lg border text-left transition ${
                      selectedSlot === item.slot
                        ? 'bg-trust-600 text-white border-trust-600 shadow-xs'
                        : item.available
                        ? 'bg-white border-slate-200 text-slate-700 hover:border-trust-400'
                        : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span className="block truncate">{item.slot}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Patient Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Consultation Notes / Symptoms
            </label>
            <textarea
              rows={2}
              value={patientNotes}
              onChange={(e) => setPatientNotes(e.target.value)}
              placeholder="Describe symptoms, reason for consultation, or questions for the doctor..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="px-5 py-2.5 rounded-xl bg-trust-600 text-white text-xs font-bold hover:bg-trust-700 transition shadow-md shadow-trust-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Appointment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
