import { User } from './user.model.js';
import { generateToken } from '../../utils/generateToken.js';
import { AppError, catchAsync } from '../../middleware/error.middleware.js';

const register = catchAsync(async (req, res) => {
  const {
    name,
    email,
    password,
    role = 'patient',
    age,
    bloodGroup,
    emergencyContacts,
    allergies,
    specialization,
    licenseNumber,
  } = req.body;

  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required.', 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const allowedRoles = ['patient', 'doctor', 'admin'];
  const userRole = allowedRoles.includes(role) ? role : 'patient';
  const isDoctor = userRole === 'doctor';
  const isAdmin = userRole === 'admin';

  let parsedContacts = emergencyContacts;
  if (typeof emergencyContacts === 'string') {
    try {
      parsedContacts = JSON.parse(emergencyContacts);
    } catch {
      parsedContacts = [];
    }
  }

  let parsedAllergies = allergies;
  if (typeof allergies === 'string') {
    try {
      parsedAllergies = JSON.parse(allergies);
    } catch {
      parsedAllergies = [allergies];
    }
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: userRole,
    age,
    bloodGroup,
    emergencyContacts: Array.isArray(parsedContacts) ? parsedContacts : [],
    allergies: Array.isArray(parsedAllergies) ? parsedAllergies : [],
    specialization: isDoctor ? specialization : undefined,
    licenseNumber: isDoctor ? licenseNumber : undefined,
    isVerified: isAdmin,
    verificationStatus: isDoctor ? 'pending' : isAdmin ? 'verified' : 'none',
  });

  return generateToken(res, user, 'Account created successfully.', 201);
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+password'
  );

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401);
  }

  return generateToken(res, user, 'User logged in successfully.');
});

const getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) throw new AppError('User not found.', 404);

  res.status(200).json({ status: 'success', data: user });
});

const listUsers = catchAsync(async (req, res) => {
  if (req.user.role === 'admin') {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json({ status: 'success', results: users.length, data: users });
  }

  const user = await User.findById(req.user.userId);
  if (!user) throw new AppError('User not found.', 404);

  res.status(200).json({ status: 'success', data: [user] });
});

const getUser = catchAsync(async (req, res) => {
  const isSelf = req.params.id === req.user.userId;
  const isAdmin = req.user.role === 'admin';

  if (!isSelf && !isAdmin) {
    throw new AppError('Forbidden: Access denied.', 403);
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);

  res.status(200).json({ status: 'success', data: user });
});

const updateUser = catchAsync(async (req, res) => {
  const isSelf = req.params.id === req.user.userId;
  const isAdmin = req.user.role === 'admin';

  if (!isSelf && !isAdmin) {
    throw new AppError('Forbidden: You can only update your own profile.', 403);
  }

  const targetUserId = req.params.id;

  const {
    name,
    password,
    age,
    bloodGroup,
    emergencyContacts,
    allergies,
    specialization,
    licenseNumber,
  } = req.body;

  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (password !== undefined) updateFields.password = password;
  if (age !== undefined) updateFields.age = age;
  if (bloodGroup !== undefined) updateFields.bloodGroup = bloodGroup;

  if (emergencyContacts !== undefined) {
    let parsedContacts = emergencyContacts;
    if (typeof emergencyContacts === 'string') {
      try {
        parsedContacts = JSON.parse(emergencyContacts);
      } catch {
        parsedContacts = [];
      }
    }
    updateFields.emergencyContacts = Array.isArray(parsedContacts)
      ? parsedContacts
      : [];
  }

  if (allergies !== undefined) {
    let parsedAllergies = allergies;
    if (typeof allergies === 'string') {
      try {
        parsedAllergies = JSON.parse(allergies);
      } catch {
        parsedAllergies = [allergies];
      }
    }
    updateFields.allergies = Array.isArray(parsedAllergies)
      ? parsedAllergies
      : [];
  }

  if (specialization !== undefined) updateFields.specialization = specialization;
  if (licenseNumber !== undefined) updateFields.licenseNumber = licenseNumber;
  if (req.body.isAvailableForBooking !== undefined) updateFields.isAvailableForBooking = Boolean(req.body.isAvailableForBooking);
  if (req.body.workingHours !== undefined) updateFields.workingHours = req.body.workingHours;
  if (req.body.workingDays !== undefined) updateFields.workingDays = req.body.workingDays;
  if (req.body.consultationFee !== undefined) updateFields.consultationFee = Number(req.body.consultationFee);
  if (req.body.hospitalOrClinic !== undefined) updateFields.hospitalOrClinic = req.body.hospitalOrClinic;
  if (req.body.bio !== undefined) updateFields.bio = req.body.bio;

  if (req.body.location !== undefined) {
    const loc = req.body.location;
    if (typeof loc === 'object' && loc !== null) {
      updateFields.location = {
        address: loc.address !== undefined ? String(loc.address).trim() : '',
        city: loc.city !== undefined ? String(loc.city).trim() : '',
        state: loc.state !== undefined ? String(loc.state).trim() : '',
        country: loc.country !== undefined ? String(loc.country).trim() : 'India',
        postalCode: loc.postalCode !== undefined ? String(loc.postalCode).trim() : '',
        latitude: typeof loc.latitude === 'number' ? loc.latitude : undefined,
        longitude: typeof loc.longitude === 'number' ? loc.longitude : undefined,
        accuracy: typeof loc.accuracy === 'number' ? loc.accuracy : undefined,
        isAllowed: Boolean(loc.isAllowed),
        updatedAt: new Date(),
      };
    }
  }

  const user = await User.findByIdAndUpdate(targetUserId, updateFields, {
    new: true,
    runValidators: true,
  });

  if (!user) throw new AppError('User not found.', 404);

  res.status(200).json({ status: 'success', data: user });
});

const deleteUser = catchAsync(async (req, res) => {
  const isSelf = req.params.id === req.user.userId;
  const isAdmin = req.user.role === 'admin';

  if (!isSelf && !isAdmin) {
    throw new AppError('Forbidden: Access denied.', 403);
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError('User not found.', 404);

  res.status(204).end();
});

export { register, login, getMe, listUsers, getUser, updateUser, deleteUser };
