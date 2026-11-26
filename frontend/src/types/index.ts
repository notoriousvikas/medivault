export type UserRole = 'patient' | 'doctor' | 'admin' | string;

export interface User {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  avatar?: string;
  bloodGroup?: string;
  allergies?: string[] | string;
  chronicConditions?: string[] | string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
  specialization?: string;
  licenseNumber?: string;
  hospital?: string;
  experienceYears?: number;
  consultationFee?: number;
  verificationStatus?: 'pending' | 'verified' | 'rejected' | string;
  isVerified?: boolean;
  bio?: string;
  address?: string;
  city?: string;
  state?: string;
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

export interface MedicalRecord {
  _id?: string;
  id?: string;
  title?: string;
  category?: string;
  recordType?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  doctorName?: string;
  hospitalName?: string;
  notes?: string;
  summary?: string;
  fileUrl?: string;
  fileType?: string;
  mimeType?: string;
  aiAnalysis?: any;
  xrayAnalysis?: any;
  [key: string]: any;
}

export interface Prescription {
  _id?: string;
  id?: string;
  title?: string;
  doctorName?: string;
  hospitalName?: string;
  date?: string;
  createdAt?: string;
  medications?: Array<{
    name?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
    [key: string]: any;
  }>;
  notes?: string;
  fileUrl?: string;
  aiAnalysis?: any;
  [key: string]: any;
}

export interface Appointment {
  _id?: string;
  id?: string;
  patientId?: string | User;
  doctorId?: string | User;
  date?: string;
  timeSlot?: string;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | string;
  reason?: string;
  notes?: string;
  priority?: string;
  triageScore?: number;
  [key: string]: any;
}

export interface TimelineEvent {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  eventType?: string;
  category?: string;
  date?: string;
  createdAt?: string;
  [key: string]: any;
}

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastContextValue {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}
