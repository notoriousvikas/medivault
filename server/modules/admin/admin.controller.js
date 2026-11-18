import { User } from '../users/user.model.js';
import { Record } from '../records/record.model.js';
import { Prescription } from '../prescriptions/prescription.model.js';
import { TimelineEvent } from '../timeline-events/timeline-event.model.js';
import { AppError, catchAsync } from '../../middleware/error.middleware.js';

/**
 * System-wide dashboard overview and aggregated statistics
 */
const getDashboardOverview = catchAsync(async (req, res) => {
  const [
    totalUsers,
    totalPatients,
    totalDoctors,
    pendingDoctors,
    verifiedDoctors,
    rejectedDoctors,
    totalRecords,
    totalPrescriptions,
    totalTimelineEvents,
    recentUsers,
    recentPendingDoctors,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'patient' }),
    User.countDocuments({ role: 'doctor' }),
    User.countDocuments({ role: 'doctor', verificationStatus: 'pending' }),
    User.countDocuments({ role: 'doctor', verificationStatus: 'verified' }),
    User.countDocuments({ role: 'doctor', verificationStatus: 'rejected' }),
    Record.countDocuments(),
    Prescription.countDocuments(),
    TimelineEvent.countDocuments(),
    User.find().sort({ createdAt: -1 }).limit(5),
    User.find({ role: 'doctor', verificationStatus: 'pending' })
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        users: {
          total: totalUsers,
          patients: totalPatients,
          doctors: totalDoctors,
        },
        doctorVerification: {
          pending: pendingDoctors,
          verified: verifiedDoctors,
          rejected: rejectedDoctors,
        },
        content: {
          records: totalRecords,
          prescriptions: totalPrescriptions,
          timelineEvents: totalTimelineEvents,
        },
      },
      recentUsers,
      recentPendingDoctors,
    },
  });
});

/**
 * Get all doctors with optional status filter & search
 */
const getAllDoctors = catchAsync(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;

  const query = { role: 'doctor' };

  if (status && ['pending', 'verified', 'rejected'].includes(status)) {
    query.verificationStatus = status;
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { specialization: searchRegex },
      { licenseNumber: searchRegex },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [doctors, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    status: 'success',
    results: doctors.length,
    pagination: {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
    data: doctors,
  });
});

/**
 * Get all doctors awaiting verification
 */
const getPendingDoctors = catchAsync(async (req, res) => {
  const pendingDoctors = await User.find({
    role: 'doctor',
    verificationStatus: 'pending',
  }).sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: pendingDoctors.length,
    data: pendingDoctors,
  });
});

/**
 * Verify, approve, or reject a doctor's account
 */
const verifyDoctor = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, isVerified, notes } = req.body;

  let finalStatus;
  let verifiedFlag;

  if (status !== undefined) {
    if (!['verified', 'rejected', 'pending'].includes(status)) {
      throw new AppError(
        'Invalid status. Allowed values are: verified, rejected, pending.',
        400
      );
    }
    finalStatus = status;
    verifiedFlag = status === 'verified';
  } else if (isVerified !== undefined) {
    verifiedFlag = Boolean(isVerified);
    finalStatus = verifiedFlag ? 'verified' : 'rejected';
  } else {
    throw new AppError(
      'Either "status" (verified/rejected/pending) or "isVerified" (boolean) is required.',
      400
    );
  }

  const doctor = await User.findOne({ _id: id, role: 'doctor' });

  if (!doctor) {
    throw new AppError('Doctor not found with the provided ID.', 404);
  }

  doctor.isVerified = verifiedFlag;
  doctor.verificationStatus = finalStatus;
  if (notes !== undefined) {
    doctor.verificationNotes = notes;
  }

  await doctor.save();

  res.status(200).json({
    status: 'success',
    message: `Doctor status updated to ${finalStatus}.`,
    data: doctor,
  });
});

/**
 * Get all users across platform with filtering and pagination
 */
const getAllUsers = catchAsync(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;

  const query = {};

  if (role && ['patient', 'doctor', 'admin'].includes(role)) {
    query.role = role;
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    status: 'success',
    results: users.length,
    pagination: {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
    data: users,
  });
});

/**
 * Get detailed profile of a specific user along with related items
 */
const getUserById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const [recordsCount, prescriptionsCount, timelineEventsCount] =
    await Promise.all([
      Record.countDocuments({ userId: id }),
      Prescription.countDocuments({ userId: id }),
      TimelineEvent.countDocuments({ userId: id }),
    ]);

  res.status(200).json({
    status: 'success',
    data: {
      user,
      stats: {
        recordsCount,
        prescriptionsCount,
        timelineEventsCount,
      },
    },
  });
});

/**
 * Update a user's role (e.g. promote to admin or switch to doctor)
 */
const updateUserRole = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['patient', 'doctor', 'admin'].includes(role)) {
    throw new AppError(
      'Valid role is required (patient, doctor, or admin).',
      400
    );
  }

  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  user.role = role;
  if (role === 'doctor' && user.verificationStatus === 'none') {
    user.verificationStatus = 'pending';
    user.isVerified = false;
  } else if (role === 'admin') {
    user.isVerified = true;
    user.verificationStatus = 'verified';
  }

  await user.save();

  res.status(200).json({
    status: 'success',
    message: `User role updated to ${role}.`,
    data: user,
  });
});

/**
 * Delete a user and optionally their associated data
 */
const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Cleanup user's associated medical records, prescriptions, and timeline events
  await Promise.all([
    Record.deleteMany({ userId: id }),
    Prescription.deleteMany({ userId: id }),
    TimelineEvent.deleteMany({ userId: id }),
  ]);

  res.status(204).end();
});

/**
 * Get all medical records platform-wide
 */
const getAllRecords = catchAsync(async (req, res) => {
  const { category, userId, page = 1, limit = 20 } = req.query;

  const query = {};
  if (category) query.category = category;
  if (userId) query.userId = userId;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [records, total] = await Promise.all([
    Record.find(query)
      .populate('userId', 'name email role')
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limitNum),
    Record.countDocuments(query),
  ]);

  res.status(200).json({
    status: 'success',
    results: records.length,
    pagination: {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
    data: records,
  });
});

/**
 * Get all prescriptions platform-wide
 */
const getAllPrescriptions = catchAsync(async (req, res) => {
  const { userId, page = 1, limit = 20 } = req.query;

  const query = {};
  if (userId) query.userId = userId;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [prescriptions, total] = await Promise.all([
    Prescription.find(query)
      .populate('userId', 'name email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum),
    Prescription.countDocuments(query),
  ]);

  res.status(200).json({
    status: 'success',
    results: prescriptions.length,
    pagination: {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
    data: prescriptions,
  });
});

/**
 * Get all timeline events platform-wide
 */
const getAllTimelineEvents = catchAsync(async (req, res) => {
  const { userId, eventType, page = 1, limit = 20 } = req.query;

  const query = {};
  if (userId) query.userId = userId;
  if (eventType) query.eventType = eventType;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [events, total] = await Promise.all([
    TimelineEvent.find(query)
      .populate('userId', 'name email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum),
    TimelineEvent.countDocuments(query),
  ]);

  res.status(200).json({
    status: 'success',
    results: events.length,
    pagination: {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
    data: events,
  });
});

export {
  getDashboardOverview,
  getAllDoctors,
  getPendingDoctors,
  verifyDoctor,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getAllRecords,
  getAllPrescriptions,
  getAllTimelineEvents,
};
