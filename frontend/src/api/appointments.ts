import api from './client';

export interface AutoBookXRayParams {
  recordId?: string;
  preferredDoctorId?: string;
  preferredDate?: string;
  notes?: string;
}

export const appointmentsApi = {
  // Auto-book based on DenseNet-121 X-ray triage
  autoBookXRayAppointment: async ({ recordId, preferredDoctorId, preferredDate, notes }: AutoBookXRayParams = {}) => {
    const res = await api.post('/appointments/auto-book-xray', {
      recordId,
      preferredDoctorId,
      preferredDate,
      notes,
    });
    return res.data;
  },

  // Manual appointment creation
  createAppointment: async (appointmentData: Record<string, any>) => {
    const res = await api.post('/appointments', appointmentData);
    return res.data;
  },

  // List all appointments for logged-in user (patients see bookings, doctors see priority queue)
  getAppointments: async () => {
    const res = await api.get('/appointments');
    return res.data;
  },

  // Get specific appointment by ID
  getAppointmentById: async (id: string) => {
    const res = await api.get(`/appointments/${id}`);
    return res.data;
  },

  // Update appointment status or notes
  updateAppointmentStatus: async (id: string, updateData: Record<string, any>) => {
    const res = await api.patch(`/appointments/${id}/status`, updateData);
    return res.data;
  },

  // Get doctor available slots for a given date
  getDoctorSlots: async (doctorId: string, date: string) => {
    const res = await api.get(`/appointments/doctor-slots/${doctorId}`, {
      params: { date },
    });
    return res.data;
  },

  // Doctor availability & schedule configuration
  getDoctorAvailability: async () => {
    const res = await api.get('/appointments/doctor/availability');
    return res.data;
  },

  updateDoctorAvailability: async (availabilityData: Record<string, any>) => {
    const res = await api.patch('/appointments/doctor/availability', availabilityData);
    return res.data;
  },
};
