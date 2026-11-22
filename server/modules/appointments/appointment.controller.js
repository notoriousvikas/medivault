import mongoose from 'mongoose';
import { Appointment } from './appointment.model.js';
import { User } from '../users/user.model.js';
import { Record } from '../records/record.model.js';
import { Consultation, ConsultationMessage } from '../consultations/consultation.model.js';
import { AppError, catchAsync } from '../../middleware/error.middleware.js';
import {
  analyzeChestXRay,
  fetchFileBufferFromUrl,
  synthesizeXRayReportWithGroq,
} from '../../services/ai.service.js';

/**
 * Pathology criticality and specialist routing rules.
 */
const HIGH_CRITICALITY_PATHOLOGIES = [
  'Pneumothorax',
  'Edema',
  'Consolidation',
  'Pneumonia',
  'Effusion',
  'Mass',
];

const SPECIALTY_MAPPING = {
  Pneumothorax: 'Pulmonology',
  Edema: 'Cardiology',
  Consolidation: 'Pulmonology',
  Pneumonia: 'Pulmonology',
  Effusion: 'Pulmonology',
  Cardiomegaly: 'Cardiology',
  Mass: 'Oncology',
  Nodule: 'Pulmonology',
  Atelectasis: 'Pulmonology',
  Infiltration: 'Pulmonology',
  Fracture: 'Orthopedics',
  Emphysema: 'Pulmonology',
  Fibrosis: 'Pulmonology',
  Pleural_Thickening: 'Pulmonology',
  Hematology: 'Hematology',
  'Blood Test': 'Hematology',
  'Complete Blood Count': 'Hematology',
  Endocrinology: 'Endocrinology',
  Nephrology: 'Nephrology',
  Cardiology: 'Cardiology',
  Gastroenterology: 'Gastroenterology',
  Pathology: 'Pathology',
  'General Medicine': 'General Medicine',
};

/**
 * Triage pathology findings into urgency levels: CRITICAL, URGENT, ROUTINE for Chest X-Rays.
 */
export function triageXRayFindings(findings = []) {
  if (!findings || findings.length === 0) {
    return {
      urgency: 'ROUTINE',
      highestScore: 0,
      primaryCondition: 'No Abnormal Findings Detected',
      recommendedSpecialty: 'General Medicine',
      summary: 'Chest radiograph evaluated. No severe acute pathologies identified.',
    };
  }

  // Sort findings by raw score descending
  const sorted = [...findings].sort((a, b) => (b.raw_score || 0) - (a.raw_score || 0));
  const topFinding = sorted[0] || { label: 'Unknown', raw_score: 0 };
  const topScore = Number(topFinding.raw_score || 0);

  let urgency = 'ROUTINE';
  let primaryCondition = topFinding.label || 'Chest Radiograph Evaluation';

  // Check critical thresholds
  const criticalFound = sorted.find((f) => {
    const score = Number(f.raw_score || 0);
    if (f.label === 'Pneumothorax' && score >= 0.32) return true;
    if (f.label === 'Edema' && score >= 0.35) return true;
    if (f.label === 'Consolidation' && score >= 0.42) return true;
    if (f.label === 'Pneumonia' && score >= 0.42) return true;
    if (f.label === 'Mass' && score >= 0.38) return true;
    if (score >= 0.60) return true;
    return false;
  });

  if (criticalFound) {
    urgency = 'CRITICAL';
    primaryCondition = criticalFound.label;
  } else {
    // Check urgent thresholds
    const urgentFound = sorted.find((f) => {
      const score = Number(f.raw_score || 0);
      if (HIGH_CRITICALITY_PATHOLOGIES.includes(f.label) && score >= 0.20) return true;
      if (score >= 0.28) return true;
      return false;
    });

    if (urgentFound) {
      urgency = 'URGENT';
      primaryCondition = urgentFound.label;
    }
  }

  const recommendedSpecialty = SPECIALTY_MAPPING[primaryCondition] || 'Pulmonology';

  const summary =
    urgency === 'CRITICAL'
      ? `🚨 CRITICAL FINDING: Model detected significant pattern for ${primaryCondition} (confidence score: ${topScore.toFixed(3)}). Immediate clinical correlation and emergency specialist consultation required.`
      : urgency === 'URGENT'
      ? `⚠️ URGENT FINDING: Elevated radiographic patterns observed for ${primaryCondition} (score: ${topScore.toFixed(3)}). Specialist review recommended within 24 hours.`
      : `Routine radiographic review. Top observed pattern: ${primaryCondition} (${topScore.toFixed(3)}). No immediate acute crisis flagged.`;

  return {
    urgency,
    highestScore: topScore,
    primaryCondition,
    recommendedSpecialty,
    summary,
  };
}

/**
 * Triage laboratory reports, blood tests, pathology, and clinical reports
 * WITHOUT DenseNet-121.
 * Evaluates clinical urgency: CRITICAL, URGENT, ROUTINE.
 */
export function triageLabReport({ title = '', category = '', parsedData = {} }) {
  const titleLower = (title || '').toLowerCase();
  const catLower = (category || '').toLowerCase();
  const biomarkers = Array.isArray(parsedData?.biomarkers) ? parsedData.biomarkers : [];

  let urgency = 'ROUTINE';
  let primaryCondition = title || 'Laboratory Report Evaluation';
  let recommendedSpecialty = 'General Medicine';
  let highestScore = 0.90;
  let criticalFindings = [];

  // 1. Check known extracted biomarkers
  for (const bm of biomarkers) {
    const name = (bm.name || '').toLowerCase();
    const valStr = String(bm.value || '');
    const numVal = parseFloat(valStr.replace(/[^0-9.]/g, ''));

    // Hemoglobin (Hb) in g/dL
    if (name.includes('hemoglobin') || name.includes('haemoglobin') || name === 'hb') {
      if (!isNaN(numVal)) {
        if (numVal < 7.0) {
          urgency = 'CRITICAL';
          primaryCondition = `Severe Critical Anemia (Hb: ${valStr})`;
          recommendedSpecialty = 'Hematology';
          criticalFindings.push(`Critical low hemoglobin: ${valStr}`);
        } else if (numVal < 9.5 && urgency !== 'CRITICAL') {
          urgency = 'URGENT';
          primaryCondition = `Moderate Anemia (Hb: ${valStr})`;
          recommendedSpecialty = 'Hematology';
          criticalFindings.push(`Low hemoglobin: ${valStr}`);
        }
      }
    }

    // White Blood Cell Count / Leukocytes
    if (name.includes('leukocyte') || name.includes('wbc') || name.includes('white blood')) {
      if (!isNaN(numVal)) {
        if (numVal > 30000 || (numVal < 1500 && numVal > 0)) {
          urgency = 'CRITICAL';
          primaryCondition = `Critical Leukocyte Anomaly (WBC: ${valStr})`;
          recommendedSpecialty = 'Hematology';
          criticalFindings.push(`Critical WBC: ${valStr}`);
        } else if ((numVal > 12000 || numVal < 3800) && urgency !== 'CRITICAL') {
          urgency = 'URGENT';
          primaryCondition = `Abnormal Leukocyte Count (WBC: ${valStr})`;
          recommendedSpecialty = 'Hematology';
          criticalFindings.push(`Elevated/Depressed WBC: ${valStr}`);
        }
      }
    }

    // Platelets
    if (name.includes('platelet')) {
      if (!isNaN(numVal)) {
        const normalized = numVal > 1000 ? numVal : numVal * 100000;
        if (normalized < 25000 && normalized > 0) {
          urgency = 'CRITICAL';
          primaryCondition = `Severe Thrombocytopenia (Platelets: ${valStr})`;
          recommendedSpecialty = 'Hematology';
          criticalFindings.push(`Critical low platelets: ${valStr}`);
        } else if (normalized < 80000 && urgency !== 'CRITICAL') {
          urgency = 'URGENT';
          primaryCondition = `Thrombocytopenia (Platelets: ${valStr})`;
          recommendedSpecialty = 'Hematology';
          criticalFindings.push(`Low platelets: ${valStr}`);
        }
      }
    }

    // Blood Sugar / Glucose
    if (name.includes('glucose') || name.includes('sugar')) {
      if (!isNaN(numVal)) {
        if (numVal > 400 || (numVal < 50 && numVal > 0)) {
          urgency = 'CRITICAL';
          primaryCondition = `Critical Glycemic Crisis (Glucose: ${valStr})`;
          recommendedSpecialty = 'Endocrinology';
          criticalFindings.push(`Critical blood glucose: ${valStr}`);
        } else if ((numVal > 200 || numVal < 70) && urgency !== 'CRITICAL') {
          urgency = 'URGENT';
          primaryCondition = `Hyperglycemia / Uncontrolled Diabetes (Glucose: ${valStr})`;
          recommendedSpecialty = 'Endocrinology';
          criticalFindings.push(`Elevated blood glucose: ${valStr}`);
        }
      }
    }

    // Kidney / Creatinine
    if (name.includes('creatinine')) {
      if (!isNaN(numVal) && numVal > 4.0) {
        urgency = 'CRITICAL';
        primaryCondition = `Acute Renal Impairment (Creatinine: ${valStr})`;
        recommendedSpecialty = 'Nephrology';
      } else if (!isNaN(numVal) && numVal > 2.0 && urgency !== 'CRITICAL') {
        urgency = 'URGENT';
        primaryCondition = `Renal Insufficiency (Creatinine: ${valStr})`;
        recommendedSpecialty = 'Nephrology';
      }
    }

    // High risk flag in parsed biomarker
    if ((bm.status === 'critical' || bm.risk === 'high') && urgency !== 'CRITICAL') {
      urgency = 'URGENT';
      primaryCondition = `Elevated ${bm.name} (${valStr})`;
    }
  }

  // 2. Specialty routing based on title/category if not set above
  if (recommendedSpecialty === 'General Medicine') {
    if (titleLower.includes('blood') || titleLower.includes('cbc') || titleLower.includes('hematolog') || titleLower.includes('platelet')) {
      recommendedSpecialty = 'Hematology';
      if (urgency === 'ROUTINE') primaryCondition = 'Complete Blood Count (CBC) Panel';
    } else if (titleLower.includes('lipid') || titleLower.includes('cholesterol') || titleLower.includes('cardiac') || titleLower.includes('ecg')) {
      recommendedSpecialty = 'Cardiology';
      if (urgency === 'ROUTINE') primaryCondition = 'Cardiovascular / Lipid Profile';
    } else if (titleLower.includes('diabetes') || titleLower.includes('thyroid') || titleLower.includes('hba1c') || titleLower.includes('glucose')) {
      recommendedSpecialty = 'Endocrinology';
      if (urgency === 'ROUTINE') primaryCondition = 'Endocrine / Glycemic Profile';
    } else if (titleLower.includes('kidney') || titleLower.includes('renal') || titleLower.includes('urine')) {
      recommendedSpecialty = 'Nephrology';
      if (urgency === 'ROUTINE') primaryCondition = 'Renal / Urinalysis Profile';
    } else if (catLower.includes('prescription')) {
      recommendedSpecialty = 'General Medicine';
      if (urgency === 'ROUTINE') primaryCondition = 'Medication Safety Regimen';
    }
  }

  const summary =
    urgency === 'CRITICAL'
      ? `🚨 CRITICAL LAB ALERT: Marked clinical abnormality identified for ${primaryCondition}. Immediate physician correlation and urgent clinical intervention required.`
      : urgency === 'URGENT'
      ? `⚠️ URGENT LAB REVIEW: Out-of-range clinical values detected for ${primaryCondition}. Specialist consultation recommended within 24-48 hours.`
      : `🟢 Routine laboratory review. ${primaryCondition} evaluated. Measured parameters are within standard clinical baseline or indicate mild, non-acute variations.`;

  return {
    urgency,
    highestScore,
    primaryCondition,
    recommendedSpecialty,
    summary,
    modality: 'Laboratory Medicine (No DenseNet)',
    isXRay: false,
    criticalFindings,
  };
}

/**
 * Generate standard daily slots between start and end hours.
 */
function generateTimeSlots(startStr = '09:00', endStr = '17:00') {
  const [startH] = startStr.split(':').map(Number);
  const [endH] = endStr.split(':').map(Number);

  const slots = [];
  for (let h = startH; h < endH; h++) {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    const nextH = h + 1;
    const nextH12 = nextH % 12 === 0 ? 12 : nextH % 12;
    const nextAmpm = nextH < 12 ? 'AM' : 'PM';

    slots.push(
      `${String(h12).padStart(2, '0')}:00 ${ampm} - ${String(h12).padStart(2, '0')}:30 ${ampm}`
    );
    slots.push(
      `${String(h12).padStart(2, '0')}:30 ${ampm} - ${String(nextH12).padStart(2, '0')}:00 ${nextAmpm}`
    );
  }
  return slots;
}

/**
 * Find best matching available doctor based on specialty.
 */
export async function findAvailableDoctor(specialty) {
  // 1. Try finding verified and available doctor matching specialty
  let doctor = await User.findOne({
    role: 'doctor',
    isAvailableForBooking: true,
    specialization: new RegExp(specialty, 'i'),
  }).sort({ isVerified: -1, createdAt: 1 });

  // 2. Try any doctor with matching specialty (even if availability toggle is unset)
  if (!doctor) {
    doctor = await User.findOne({
      role: 'doctor',
      specialization: new RegExp(specialty, 'i'),
    }).sort({ isVerified: -1, createdAt: 1 });
  }

  // 3. Try any available doctor
  if (!doctor) {
    doctor = await User.findOne({
      role: 'doctor',
      isAvailableForBooking: true,
    }).sort({ isVerified: -1, createdAt: 1 });
  }

  // 4. Fallback to any doctor in system
  if (!doctor) {
    doctor = await User.findOne({ role: 'doctor' }).sort({ isVerified: -1, createdAt: 1 });
  }

  return doctor;
}

/**
 * Automatically triage an uploaded X-ray record using DenseNet-121 findings
 * and book a priority specialist appointment.
 * POST /api/appointments/auto-book-xray
 */
export const autoBookXRayAppointment = catchAsync(async (req, res) => {
  const userId = req.user.userId;
  const { recordId, preferredDoctorId, preferredDate, notes } = req.body;

  if (!recordId) {
    throw new AppError('recordId is required for auto-booking an X-ray appointment.', 400);
  }

  const record = await Record.findOne({ _id: recordId, userId });
  if (!record) {
    throw new AppError('Medical record not found.', 404);
  }

  const catLower = (record.category || '').toLowerCase();
  const titleLower = (record.title || '').toLowerCase();
  const isExplicitNonXRay =
    catLower.includes('lab') ||
    catLower.includes('prescription') ||
    catLower.includes('discharge') ||
    catLower.includes('note') ||
    catLower.includes('blood');

  let triage;
  let xrayData = null;

  if (isExplicitNonXRay) {
    // ── Non-XRay Lab / Clinical Report Triage (ZERO DenseNet) ──
    triage = triageLabReport({
      title: record.title,
      category: record.category,
      parsedData: record.parsedData || {},
    });

    record.parsedData = {
      ...(record.parsedData || {}),
      triage,
      analyzedAt: new Date(),
    };
    await record.save();
  } else {
    // ── Chest X-Ray Triage (DenseNet-121) ──
    xrayData = record.parsedData?.xrayAnalysis;

    // If the record has not been analyzed by DenseNet-121 yet, run it on-the-fly!
    if (!xrayData || !xrayData.findings || xrayData.findings.length === 0) {
      if (!record.fileUrl) {
        throw new AppError('Record does not contain an imaging scan file for analysis.', 400);
      }

      const downloaded = await fetchFileBufferFromUrl(record.fileUrl);
      xrayData = await analyzeChestXRay({
        fileBuffer: downloaded.buffer,
        filename: downloaded.filename || `${record.title}.png`,
        contentType: downloaded.contentType || 'image/png',
        scanId: record._id.toString(),
      });

      const patientProfile = await User.findById(userId)
        .select('name age bloodGroup allergies')
        .lean();

      const summary = await synthesizeXRayReportWithGroq({
        xrayResult: xrayData,
        patientProfile,
        recordTitle: record.title,
      });

      record.parsedData = {
        ...(record.parsedData || {}),
        xrayAnalysis: xrayData,
        aiAnalysis: summary,
        summary,
        analyzedAt: new Date(),
      };
      await record.save();
    }

    triage = triageXRayFindings(xrayData.findings || []);
  }

  // Doctor selection: preferred doctor or matched specialist
  let doctor;
  if (preferredDoctorId) {
    doctor = await User.findOne({ _id: preferredDoctorId, role: 'doctor' });
  }
  if (!doctor) {
    doctor = await findAvailableDoctor(triage.recommendedSpecialty);
  }

  if (!doctor) {
    throw new AppError(
      'No active doctors are currently registered in the system. Please register a doctor account.',
      404
    );
  }

  // Calculate appointment date and slot based on urgency
  const now = new Date();
  let appointmentDate = preferredDate ? new Date(preferredDate) : new Date();
  let timeSlot = '';
  let appointmentType = 'teleconsult';

  if (triage.urgency === 'CRITICAL') {
    // Critical: schedule immediate or earliest emergency slot today
    appointmentDate = new Date();
    timeSlot = `IMMEDIATE - Emergency Triage Slot (${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    appointmentType = 'emergency_priority';
  } else if (triage.urgency === 'URGENT') {
    // Urgent: schedule within 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    appointmentDate = preferredDate ? new Date(preferredDate) : tomorrow;
    timeSlot = '10:00 AM - 10:30 AM (Urgent Slot)';
  } else {
    // Routine: schedule in next standard working day slot
    const scheduled = new Date();
    scheduled.setDate(scheduled.getDate() + 2);
    appointmentDate = preferredDate ? new Date(preferredDate) : scheduled;
    timeSlot = '11:30 AM - 12:00 PM (Routine)';
  }

  // Create or retrieve existing Consultation between patient and doctor
  let consultation = await Consultation.findOne({
    patientId: userId,
    doctorId: doctor._id,
  });

  const patient = await User.findById(userId).select('name');

  if (!consultation) {
    consultation = await Consultation.create({
      patientId: userId,
      doctorId: doctor._id,
      status: 'active',
      lastMessage: `Appointment scheduled [${triage.urgency}]: ${triage.primaryCondition}`,
      lastMessageAt: new Date(),
      lastSenderId: userId,
    });
  }

  // Post system triage notice in consultation chat
  const triageNoticeText =
    triage.urgency === 'CRITICAL'
      ? `🚨 [CRITICAL AI TRIAGE ALERT]: An emergency appointment has been automatically booked for ${patient?.name || 'the patient'}.\n• Primary Finding: ${triage.primaryCondition} (Confidence Score: ${triage.highestScore.toFixed(3)})\n• Urgency: CRITICAL EMERGENCY\n• Action: Immediate radiologist/specialist review recommended.`
      : `⚠️ [AI Clinical Triage]: Appointment booked for ${patient?.name || 'the patient'}.\n• Finding: ${triage.primaryCondition} (Score: ${triage.highestScore.toFixed(3)})\n• Urgency: ${triage.urgency}`;

  await ConsultationMessage.create({
    consultationId: consultation._id,
    senderId: userId,
    senderRole: 'patient',
    recipientId: doctor._id,
    text: triageNoticeText,
    recordAttachment: {
      recordId: record._id,
      title: record.title,
      fileUrl: record.fileUrl,
      category: record.category || 'Imaging Scan',
    },
    read: false,
  });

  // Create Appointment
  const appointment = await Appointment.create({
    patientId: userId,
    doctorId: doctor._id,
    recordId: record._id,
    urgency: triage.urgency,
    criticalityScore: triage.highestScore,
    primaryCondition: triage.primaryCondition,
    triageDetails: {
      pathologyScores: xrayData.findings || [],
      clinicalSummary: triage.summary,
      recommendedSpecialty: triage.recommendedSpecialty,
      triagedAt: new Date(),
    },
    appointmentDate,
    timeSlot,
    type: appointmentType,
    status: triage.urgency === 'CRITICAL' ? 'confirmed' : 'pending',
    autoBooked: true,
    consultationId: consultation._id,
    patientNotes: notes || `Auto-booked based on DenseNet-121 analysis for ${triage.primaryCondition}.`,
  });

  const populated = await Appointment.findById(appointment._id)
    .populate('patientId', 'name email age bloodGroup emergencyContacts')
    .populate(
      'doctorId',
      'name email specialization hospitalOrClinic consultationFee isAvailableForBooking workingHours workingDays'
    )
    .populate('recordId', 'title category fileUrl uploadDate parsedData');

  res.status(201).json({
    status: 'success',
    data: {
      appointment: populated,
      triage,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        specialization: doctor.specialization || triage.recommendedSpecialty,
        hospital: doctor.hospitalOrClinic,
      },
      consultationId: consultation._id,
    },
  });
});

/**
 * Manual appointment booking by patient.
 * POST /api/appointments
 */
export const createAppointment = catchAsync(async (req, res) => {
  const patientId = req.user.userId;
  const {
    doctorId,
    recordId,
    appointmentDate,
    timeSlot,
    type = 'teleconsult',
    urgency = 'ROUTINE',
    patientNotes,
  } = req.body;

  if (!doctorId || doctorId === 'undefined' || !mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new AppError('Valid doctorId is required.', 400);
  }

  if (!appointmentDate || !timeSlot) {
    throw new AppError('appointmentDate and timeSlot are required.', 400);
  }

  const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
  if (!doctor) {
    throw new AppError('Doctor not found.', 404);
  }

  if (doctor.isAvailableForBooking === false) {
    throw new AppError('Doctor is currently not accepting new appointments.', 400);
  }

  // Ensure consultation thread exists
  let consultation = await Consultation.findOne({ patientId, doctorId });
  if (!consultation) {
    consultation = await Consultation.create({
      patientId,
      doctorId,
      status: 'active',
      lastMessage: `Appointment requested for ${new Date(appointmentDate).toLocaleDateString()} at ${timeSlot}`,
      lastMessageAt: new Date(),
      lastSenderId: patientId,
    });
  }

  const validRecordId =
    recordId && recordId !== 'undefined' && recordId !== 'null' && mongoose.Types.ObjectId.isValid(recordId)
      ? recordId
      : undefined;

  const appointment = await Appointment.create({
    patientId,
    doctorId,
    recordId: validRecordId,
    appointmentDate: new Date(appointmentDate),
    timeSlot,
    type,
    urgency,
    status: 'pending',
    autoBooked: false,
    consultationId: consultation._id,
    patientNotes,
  });

  const populated = await Appointment.findById(appointment._id)
    .populate('patientId', 'name email age bloodGroup')
    .populate('doctorId', 'name email specialization hospitalOrClinic')
    .populate('recordId', 'title fileUrl category');

  res.status(201).json({
    status: 'success',
    data: populated,
  });
});

/**
 * List appointments for logged-in user.
 * Patients see their bookings.
 * Doctors see their appointments (sorted with CRITICAL first).
 * GET /api/appointments
 */
export const listAppointments = catchAsync(async (req, res) => {
  const currentUserId = req.user.userId;
  const isDoctor = req.user.role === 'doctor';
  const isAdmin = req.user.role === 'admin';

  let filter = {};
  if (isDoctor) {
    filter = { doctorId: currentUserId };
  } else if (!isAdmin) {
    filter = { patientId: currentUserId };
  }

  const appointments = await Appointment.find(filter)
    .populate('patientId', 'name email age bloodGroup allergies emergencyContacts')
    .populate(
      'doctorId',
      'name email specialization hospitalOrClinic isAvailableForBooking workingHours workingDays consultationFee'
    )
    .populate('recordId', 'title category fileUrl parsedData')
    .sort({
      // Prioritize CRITICAL appointments first, then appointment date
      urgency: 1, // 'CRITICAL' < 'ROUTINE' < 'URGENT' alphabetically, but we can custom sort
      appointmentDate: 1,
    });

  // Custom sort order: CRITICAL -> URGENT -> ROUTINE
  const urgencyWeight = { CRITICAL: 3, URGENT: 2, ROUTINE: 1 };
  appointments.sort((a, b) => {
    const weightDiff = (urgencyWeight[b.urgency] || 1) - (urgencyWeight[a.urgency] || 1);
    if (weightDiff !== 0) return weightDiff;
    return new Date(a.appointmentDate) - new Date(b.appointmentDate);
  });

  res.status(200).json({
    status: 'success',
    results: appointments.length,
    data: appointments,
  });
});

/**
 * Get single appointment by ID.
 * GET /api/appointments/:id
 */
export const getAppointment = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.userId;

  const appointment = await Appointment.findById(id)
    .populate('patientId', 'name email age bloodGroup allergies emergencyContacts')
    .populate('doctorId', 'name email specialization hospitalOrClinic')
    .populate('recordId', 'title category fileUrl parsedData');

  if (!appointment) {
    throw new AppError('Appointment not found.', 404);
  }

  const isPatient = appointment.patientId?._id?.toString() === currentUserId;
  const isDoctor = appointment.doctorId?._id?.toString() === currentUserId;
  const isAdmin = req.user.role === 'admin';

  if (!isPatient && !isDoctor && !isAdmin) {
    throw new AppError('Forbidden: Access denied to this appointment.', 403);
  }

  res.status(200).json({
    status: 'success',
    data: appointment,
  });
});

/**
 * Update appointment status (confirm, complete, cancel, add doctor notes).
 * PATCH /api/appointments/:id/status
 */
export const updateAppointmentStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, doctorNotes, timeSlot, appointmentDate } = req.body;
  const currentUserId = req.user.userId;

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    throw new AppError('Appointment not found.', 404);
  }

  const isPatient = appointment.patientId.toString() === currentUserId;
  const isDoctor = appointment.doctorId.toString() === currentUserId;
  const isAdmin = req.user.role === 'admin';

  if (!isPatient && !isDoctor && !isAdmin) {
    throw new AppError('Forbidden: Access denied.', 403);
  }

  if (status) {
    const allowedStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      throw new AppError(`Invalid status: ${status}`, 400);
    }
    appointment.status = status;
  }

  if (doctorNotes !== undefined && (isDoctor || isAdmin)) {
    appointment.doctorNotes = doctorNotes;
  }

  if (timeSlot) appointment.timeSlot = timeSlot;
  if (appointmentDate) appointment.appointmentDate = new Date(appointmentDate);

  await appointment.save();

  const updated = await Appointment.findById(id)
    .populate('patientId', 'name email age bloodGroup')
    .populate('doctorId', 'name email specialization hospitalOrClinic')
    .populate('recordId', 'title fileUrl');

  res.status(200).json({
    status: 'success',
    data: updated,
  });
});

/**
 * Query available booking slots for a doctor on a specific date.
 * GET /api/appointments/doctor-slots/:doctorId?date=YYYY-MM-DD
 */
export const getDoctorSlots = catchAsync(async (req, res) => {
  const { doctorId } = req.params;
  const { date } = req.query;

  if (!doctorId || doctorId === 'undefined' || !mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new AppError('Valid Doctor ID is required.', 400);
  }

  const doctor = await User.findOne({ _id: doctorId, role: 'doctor' }).select(
    'name specialization isAvailableForBooking workingHours workingDays consultationFee hospitalOrClinic'
  );

  if (!doctor) {
    throw new AppError('Doctor not found.', 404);
  }

  const queryDate = date ? new Date(date) : new Date();
  const dayName = queryDate.toLocaleDateString('en-US', { weekday: 'long' });

  const workingDays = doctor.workingDays || [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
  ];
  const isWorkingDay = workingDays.includes(dayName);

  const startStr = doctor.workingHours?.start || '09:00';
  const endStr = doctor.workingHours?.end || '17:00';

  const allSlots = generateTimeSlots(startStr, endStr);

  // Find appointments already booked for this doctor on query date
  const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

  const bookedAppointments = await Appointment.find({
    doctorId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $ne: 'cancelled' },
  }).select('timeSlot urgency');

  const bookedSlotSet = new Set(bookedAppointments.map((a) => a.timeSlot));

  const slotsWithAvailability = allSlots.map((slot) => ({
    slot,
    available: isWorkingDay && doctor.isAvailableForBooking && !bookedSlotSet.has(slot),
  }));

  res.status(200).json({
    status: 'success',
    data: {
      doctorId,
      doctorName: doctor.name,
      specialization: doctor.specialization,
      isAvailableForBooking: doctor.isAvailableForBooking,
      isWorkingDay,
      dayName,
      slots: slotsWithAvailability,
    },
  });
});

/**
 * Doctor schedule & availability management.
 * GET /api/appointments/doctor/availability
 */
export const getDoctorAvailability = catchAsync(async (req, res) => {
  const doctor = await User.findById(req.user.userId).select(
    'name isAvailableForBooking workingHours workingDays consultationFee hospitalOrClinic bio specialization'
  );

  if (!doctor) {
    throw new AppError('User not found.', 404);
  }

  res.status(200).json({
    status: 'success',
    data: doctor,
  });
});

/**
 * Doctor updates their availability & schedule settings.
 * PATCH /api/appointments/doctor/availability
 */
export const updateDoctorAvailability = catchAsync(async (req, res) => {
  const currentUserId = req.user.userId;
  const isDoctor = req.user.role === 'doctor';
  const isAdmin = req.user.role === 'admin';

  if (!isDoctor && !isAdmin) {
    throw new AppError('Forbidden: Only doctors can configure schedule availability.', 403);
  }

  const {
    isAvailableForBooking,
    workingHours,
    workingDays,
    consultationFee,
    hospitalOrClinic,
    bio,
  } = req.body;

  const updateFields = {};
  if (isAvailableForBooking !== undefined) {
    updateFields.isAvailableForBooking = Boolean(isAvailableForBooking);
  }
  if (workingHours !== undefined) {
    updateFields.workingHours = workingHours;
  }
  if (workingDays !== undefined) {
    updateFields.workingDays = workingDays;
  }
  if (consultationFee !== undefined) {
    updateFields.consultationFee = Number(consultationFee);
  }
  if (hospitalOrClinic !== undefined) {
    updateFields.hospitalOrClinic = hospitalOrClinic;
  }
  if (bio !== undefined) {
    updateFields.bio = bio;
  }

  const updatedDoctor = await User.findByIdAndUpdate(currentUserId, updateFields, {
    new: true,
    runValidators: true,
  }).select(
    'name isAvailableForBooking workingHours workingDays consultationFee hospitalOrClinic bio specialization'
  );

  res.status(200).json({
    status: 'success',
    message: 'Doctor availability and schedule updated successfully.',
    data: updatedDoctor,
  });
});
