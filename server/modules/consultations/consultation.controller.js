import { Consultation, ConsultationMessage } from './consultation.model.js';
import { User } from '../users/user.model.js';
import { AppError, catchAsync } from '../../middleware/error.middleware.js';
import { generateQRCodeDataURL } from '../../utils/qrcode.js';

/**
 * Get all available doctors for consultation.
 */
export const getDoctors = catchAsync(async (req, res) => {
  const { search, specialization } = req.query;
  const query = { role: 'doctor' };

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { specialization: searchRegex },
    ];
  }

  if (specialization && specialization !== 'all') {
    query.specialization = new RegExp(specialization.trim(), 'i');
  }

  const doctors = await User.find(query)
    .select(
      'name email specialization licenseNumber isVerified verificationStatus createdAt isAvailableForBooking workingHours workingDays consultationFee hospitalOrClinic bio'
    )
    .sort({ isVerified: -1, isAvailableForBooking: -1, name: 1 });

  res.status(200).json({
    status: 'success',
    results: doctors.length,
    data: doctors,
  });
});

/**
 * Get all active consultation threads for the logged-in user (patient or doctor).
 */
export const getConsultations = catchAsync(async (req, res) => {
  const currentUserId = req.user.userId;
  const isDoctor = req.user.role === 'doctor';

  const filter = isDoctor ? { doctorId: currentUserId } : { patientId: currentUserId };

  const consultations = await Consultation.find(filter)
    .populate('doctorId', 'name email specialization licenseNumber isVerified verificationStatus')
    .populate('patientId', 'name email age bloodGroup allergies emergencyContacts emergencyInfo')
    .sort({ lastMessageAt: -1 });

  // Compute unread count for each consultation
  const enriched = await Promise.all(
    consultations.map(async (consultation) => {
      const unreadCount = await ConsultationMessage.countDocuments({
        consultationId: consultation._id,
        recipientId: currentUserId,
        read: false,
      });

      return {
        ...consultation.toObject(),
        unreadCount,
      };
    })
  );

  res.status(200).json({
    status: 'success',
    results: enriched.length,
    data: enriched,
  });
});

/**
 * Start or get an existing consultation with a doctor or patient.
 */
export const startOrGetConsultation = catchAsync(async (req, res) => {
  const currentUserId = req.user.userId;
  const currentUserRole = req.user.role;
  const { doctorId, patientId, targetUserId } = req.body;

  let finalDoctorId;
  let finalPatientId;

  if (currentUserRole === 'doctor') {
    finalDoctorId = currentUserId;
    finalPatientId = patientId || targetUserId;
  } else {
    // Patient or default
    finalPatientId = currentUserId;
    finalDoctorId = doctorId || targetUserId;
  }

  if (!finalDoctorId || !finalPatientId) {
    throw new AppError('Both doctor and patient must be specified for a consultation.', 400);
  }

  // Validate existence
  const [doctorUser, patientUser] = await Promise.all([
    User.findById(finalDoctorId),
    User.findById(finalPatientId),
  ]);

  if (!doctorUser || doctorUser.role !== 'doctor') {
    throw new AppError('Specified doctor was not found or is invalid.', 404);
  }

  if (!patientUser) {
    throw new AppError('Specified patient was not found.', 404);
  }

  let consultation = await Consultation.findOne({
    patientId: finalPatientId,
    doctorId: finalDoctorId,
  })
    .populate('doctorId', 'name email specialization licenseNumber isVerified verificationStatus')
    .populate('patientId', 'name email age bloodGroup allergies emergencyContacts emergencyInfo');

  if (!consultation) {
    consultation = await Consultation.create({
      patientId: finalPatientId,
      doctorId: finalDoctorId,
      status: 'active',
      lastMessage: 'Consultation initiated.',
      lastMessageAt: new Date(),
      lastSenderId: currentUserId,
    });

    consultation = await Consultation.findById(consultation._id)
      .populate('doctorId', 'name email specialization licenseNumber isVerified verificationStatus')
      .populate('patientId', 'name email age bloodGroup allergies emergencyContacts emergencyInfo');

    // Create system welcome message
    await ConsultationMessage.create({
      consultationId: consultation._id,
      senderId: currentUserId,
      senderRole: currentUserRole === 'doctor' ? 'doctor' : 'patient',
      recipientId: currentUserRole === 'doctor' ? finalPatientId : finalDoctorId,
      text:
        currentUserRole === 'doctor'
          ? `Hello ${patientUser.name}, I am Dr. ${doctorUser.name}. How can I assist you with your health today?`
          : `Hello Dr. ${doctorUser.name}, I would like to consult with you regarding my medical records and health.`,
      read: false,
    });
  }

  res.status(200).json({
    status: 'success',
    data: consultation,
  });
});

/**
 * Get all messages for a specific consultation.
 */
export const getMessages = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.userId;

  const consultation = await Consultation.findById(id);
  if (!consultation) {
    throw new AppError('Consultation not found.', 404);
  }

  const isParticipant =
    consultation.patientId.toString() === currentUserId ||
    consultation.doctorId.toString() === currentUserId ||
    req.user.role === 'admin';

  if (!isParticipant) {
    throw new AppError('Forbidden: Access denied to this consultation.', 403);
  }

  const messages = await ConsultationMessage.find({ consultationId: id }).sort({
    createdAt: 1,
  });

  // Mark all unread messages received by current user as read
  await ConsultationMessage.updateMany(
    { consultationId: id, recipientId: currentUserId, read: false },
    { $set: { read: true } }
  );

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: messages,
  });
});

/**
 * Send a message within a consultation.
 */
export const sendMessage = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.userId;
  const { text, recordAttachment } = req.body;

  if (!text || !text.trim()) {
    throw new AppError('Message text is required.', 400);
  }

  const consultation = await Consultation.findById(id);
  if (!consultation) {
    throw new AppError('Consultation not found.', 404);
  }

  const isPatient = consultation.patientId.toString() === currentUserId;
  const isDoctor = consultation.doctorId.toString() === currentUserId;

  if (!isPatient && !isDoctor && req.user.role !== 'admin') {
    throw new AppError('Forbidden: Access denied to this consultation.', 403);
  }

  const senderRole = isDoctor ? 'doctor' : 'patient';
  const recipientId = isDoctor ? consultation.patientId : consultation.doctorId;

  const message = await ConsultationMessage.create({
    consultationId: id,
    senderId: currentUserId,
    senderRole,
    recipientId,
    text: text.trim(),
    recordAttachment: recordAttachment || undefined,
    read: false,
  });

  // Update consultation preview
  consultation.lastMessage = text.trim();
  consultation.lastMessageAt = new Date();
  consultation.lastSenderId = currentUserId;
  await consultation.save();

  res.status(201).json({
    status: 'success',
    data: message,
  });
});

/**
 * Patient-only: Generate patient consultation registration QR code for doctor scanning.
 */
export const getPatientRegistrationQR = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Generate payload specifically for patient doctor registration
  const registrationPayload = JSON.stringify({
    type: 'patient_registration',
    patientId: user._id.toString(),
    name: user.name,
    email: user.email,
  });

  const qrCodeDataUrl = await generateQRCodeDataURL(registrationPayload);

  res.status(200).json({
    status: 'success',
    data: {
      patientId: user._id.toString(),
      patientCode: user._id.toString().slice(-8).toUpperCase(),
      qrCodeDataUrl,
      rawPayload: registrationPayload,
      patient: {
        name: user.name,
        email: user.email,
        age: user.age,
        bloodGroup: user.bloodGroup || 'UNKNOWN',
        allergies: user.allergies || [],
        criticalConditions: user.emergencyInfo?.criticalConditions || [],
      },
    },
  });
});

/**
 * Doctor-only: Scan patient Registration QR or enter ID/code to admit patient to consultations.
 */
export const scanAndAddPatient = catchAsync(async (req, res) => {
  const currentUserId = req.user.userId;
  const currentUserRole = req.user.role;

  if (currentUserRole !== 'doctor') {
    throw new AppError(
      'Access Restricted: Only verified doctors are authorized to scan and admit patients to consultations.',
      403
    );
  }

  const { qrData, token: rawToken, patientId: rawPatientId, patientEmail } = req.body;
  let targetPatientId = rawPatientId ? String(rawPatientId).trim() : null;
  let token = rawToken ? String(rawToken).trim() : '';

  // Extract from QR payload (JSON registration payload or text)
  if (qrData && typeof qrData === 'string') {
    const trimmed = qrData.trim();

    // 1. Check if JSON payload from patient registration QR
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.patientId) {
        targetPatientId = parsed.patientId;
      }
    } catch {
      // Not JSON
    }

    if (!targetPatientId) {
      // 2. Check for patientId parameter or prefix
      const pidParamMatch = trimmed.match(/patientId=([a-zA-Z0-9]+)/i);
      if (pidParamMatch && pidParamMatch[1]) {
        targetPatientId = pidParamMatch[1];
      } else if (trimmed.match(/^[0-9a-fA-F]{24}$/)) {
        targetPatientId = trimmed;
      } else {
        // 3. Fallback: URL or emergency token
        const emergencyMatch = trimmed.match(/\/emergency\/([a-zA-Z0-9_-]+)/i);
        if (emergencyMatch && emergencyMatch[1]) {
          token = emergencyMatch[1];
        } else {
          const tokenParamMatch = trimmed.match(/[?&]token=([a-zA-Z0-9_-]+)/i);
          if (tokenParamMatch && tokenParamMatch[1]) {
            token = tokenParamMatch[1];
          } else {
            token = trimmed;
          }
        }
      }
    }
  }

  let patientUser = null;

  if (targetPatientId) {
    patientUser = await User.findById(targetPatientId);
  }

  if (!patientUser && token) {
    const query = [{ emergencyToken: token }];
    if (token.match(/^[0-9a-fA-F]{24}$/)) {
      query.push({ _id: token });
    }
    patientUser = await User.findOne({ $or: query });
  }

  if (!patientUser && patientEmail) {
    patientUser = await User.findOne({ email: patientEmail.toLowerCase().trim() });
  }

  if (!patientUser) {
    throw new AppError('No registered patient matches this QR code or patient ID.', 404);
  }

  if (patientUser._id.toString() === currentUserId.toString()) {
    throw new AppError('Doctors cannot add their own profile as a patient consultation.', 400);
  }

  const doctorUser = await User.findById(currentUserId);

  let consultation = await Consultation.findOne({
    patientId: patientUser._id,
    doctorId: currentUserId,
  })
    .populate('doctorId', 'name email specialization licenseNumber isVerified verificationStatus hospitalOrClinic')
    .populate('patientId', 'name email age bloodGroup allergies emergencyContacts emergencyInfo');

  let isNew = false;
  if (!consultation) {
    isNew = true;
    consultation = await Consultation.create({
      patientId: patientUser._id,
      doctorId: currentUserId,
      status: 'active',
      lastMessage: `Dr. ${doctorUser?.name || 'Doctor'} registered patient via QR scan.`,
      lastMessageAt: new Date(),
      lastSenderId: currentUserId,
    });

    consultation = await Consultation.findById(consultation._id)
      .populate('doctorId', 'name email specialization licenseNumber isVerified verificationStatus hospitalOrClinic')
      .populate('patientId', 'name email age bloodGroup allergies emergencyContacts emergencyInfo');

    await ConsultationMessage.create({
      consultationId: consultation._id,
      senderId: currentUserId,
      senderRole: 'doctor',
      recipientId: patientUser._id,
      text: `Hello ${patientUser.name}, I am Dr. ${doctorUser?.name || 'your physician'}. I have registered you into my clinical consultation room via Patient QR scan. How can I assist you with your health today?`,
      read: false,
    });
  }

  res.status(200).json({
    status: 'success',
    message: isNew
      ? `Patient ${patientUser.name} successfully registered to consultation!`
      : `Existing consultation with ${patientUser.name} retrieved.`,
    data: {
      consultation,
      isNew,
      patient: {
        _id: patientUser._id,
        name: patientUser.name,
        age: patientUser.age,
        bloodGroup: patientUser.bloodGroup,
        allergies: patientUser.allergies,
        criticalConditions: patientUser.emergencyInfo?.criticalConditions || [],
      },
    },
  });
});
