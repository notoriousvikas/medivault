import mongoose from 'mongoose';

const contextUsedSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    docType: { type: String, trim: true }, // 'record', 'prescription', 'profile', 'past_chat'
    snippet: { type: String, trim: true },
    refId: { type: mongoose.Schema.Types.ObjectId },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['general', 'prescription_analysis', 'record_analysis', 'consultation'],
      default: 'general',
      index: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    referenceType: {
      type: String,
      enum: ['Record', 'Prescription', 'None'],
      default: 'None',
    },
    contextUsed: {
      type: [contextUsedSchema],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const Chat = mongoose.models.Chat || mongoose.model('Chat', chatSchema);

export { Chat };
