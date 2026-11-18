import mongoose from 'mongoose';

const medicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorName: { type: String, required: true, trim: true },
    medications: { type: [medicationSchema], default: [] },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Prescription =
  mongoose.models.Prescription ||
  mongoose.model('Prescription', prescriptionSchema);

export { Prescription };
