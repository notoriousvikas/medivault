import mongoose from 'mongoose';

const timelineEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventType: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

const TimelineEvent =
  mongoose.models.TimelineEvent ||
  mongoose.model('TimelineEvent', timelineEventSchema);

export { TimelineEvent };
