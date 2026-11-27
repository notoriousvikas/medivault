import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: 'New Chat',
      maxlength: 120,
    },
    category: {
      type: String,
      enum: ['general', 'prescription_analysis', 'record_analysis', 'consultation'],
      default: 'general',
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    referenceType: {
      type: String,
      enum: ['Record', 'Prescription', 'None'],
      default: 'None',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastMessagePreview: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

chatSessionSchema.index({ userId: 1, lastMessageAt: -1 });

const ChatSession =
  mongoose.models.ChatSession || mongoose.model('ChatSession', chatSessionSchema);

export { ChatSession };
