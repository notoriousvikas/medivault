import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    relationship: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false }
);

const primaryPhysicianSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    hospital: { type: String, trim: true },
  },
  { _id: false }
);

const emergencyInfoSchema = new mongoose.Schema(
  {
    criticalConditions: { type: [String], default: [] }, // e.g., 'Type 1 Diabetes', 'Asthma', 'Epilepsy'
    notes: { type: String, trim: true }, // critical instructions, e.g. "Carries EpiPen in backpack"
    organDonor: { type: Boolean, default: false },
    primaryPhysician: { type: primaryPhysicianSchema, default: () => ({}) },
    insuranceInfo: {
      provider: { type: String, trim: true },
      policyNumber: { type: String, trim: true },
    },
    isEnabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const emergencyAccessLogSchema = new mongoose.Schema(
  {
    accessedAt: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      required: true,
      default: 'patient',
    },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    age: { type: Number, min: 0 },
    bloodGroup: { type: String, trim: true }, // e.g. "O+", "A-", "B+"
    emergencyContacts: { type: [emergencyContactSchema], default: [] },
    allergies: { type: [String], default: [] }, // e.g. ["Penicillin", "Latex", "NSAIDs"]
    specialization: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'none'],
      default: 'none',
    },
    verificationNotes: { type: String, trim: true },

    // Emergency QR Medical Access
    emergencyToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    emergencyInfo: {
      type: emergencyInfoSchema,
      default: () => ({}),
    },
    emergencyAccessLogs: {
      type: [emergencyAccessLogSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(document, returnedObject) {
        delete returnedObject.password;
        return returnedObject;
      },
    },
  }
);

userSchema.pre('save', async function preSaveHandler() {
  if (!this.emergencyToken) {
    this.emergencyToken = crypto.randomBytes(16).toString('hex');
  }

  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.pre('findOneAndUpdate', async function hashUpdatedPassword() {
  const update = this.getUpdate();
  const password = update.password ?? update.$set?.password;

  if (!password) return;

  const hashedPassword = await bcrypt.hash(password, 12);
  update.$set = { ...update.$set, password: hashedPassword };
  delete update.password;
  this.setUpdate(update);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export { User };
