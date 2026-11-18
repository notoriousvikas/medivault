import mongoose from 'mongoose';

const consultationSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

consultationSchema.index({ patientId: 1, doctorId: 1 });

const messageSchema = new mongoose.Schema(
  {
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    recordAttachment: {
      recordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Record',
      },
      title: { type: String, trim: true },
      fileUrl: { type: String, trim: true },
      category: { type: String, trim: true },
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ consultationId: 1, createdAt: 1 });

export const Consultation =
  mongoose.models.Consultation ||
  mongoose.model('Consultation', consultationSchema);

export const ConsultationMessage =
  mongoose.models.ConsultationMessage ||
  mongoose.model('ConsultationMessage', messageSchema);
