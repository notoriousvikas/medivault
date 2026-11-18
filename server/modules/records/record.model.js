import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    uploadDate: { type: Date, default: Date.now },
    parsedData: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const Record = mongoose.models.Record || mongoose.model('Record', recordSchema);

export { Record };
