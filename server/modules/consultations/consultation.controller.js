import { Consultation, ConsultationMessage } from './consultation.model.js';
import { User } from '../users/user.model.js';
import { AppError, catchAsync } from '../../middleware/error.middleware.js';

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
    .select('name email specialization licenseNumber isVerified verificationStatus createdAt')
    .sort({ isVerified: -1, name: 1 });

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
