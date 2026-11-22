import mongoose from 'mongoose';

const pathologyScoreSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    raw_score: { type: Number, required: true },
    interpretation_note: { type: String },
  },
  { _id: false }
);

const triageDetailsSchema = new mongoose.Schema(
  {
    pathologyScores: { type: [pathologyScoreSchema], default: [] },
    clinicalSummary: { type: String, trim: true },
    recommendedSpecialty: { type: String, trim: true },
    triagedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Record',
      index: true,
    },
    urgency: {
      type: String,
      enum: ['CRITICAL', 'URGENT', 'ROUTINE'],
      default: 'ROUTINE',
      index: true,
    },
    criticalityScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    primaryCondition: {
      type: String,
      trim: true,
      default: 'General Consultation',
    },
    triageDetails: {
      type: triageDetailsSchema,
      default: () => ({}),
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['teleconsult', 'in_person', 'emergency_priority'],
      default: 'teleconsult',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      default: 'confirmed',
      index: true,
    },
    autoBooked: {
      type: Boolean,
      default: false,
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
    },
    patientNotes: {
      type: String,
      trim: true,
    },
    doctorNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: 1 });
appointmentSchema.index({ urgency: 1, status: 1 });

export const Appointment =
  mongoose.models.Appointment ||
  mongoose.model('Appointment', appointmentSchema);
