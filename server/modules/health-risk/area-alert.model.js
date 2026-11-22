import mongoose from 'mongoose';

const reviewActionSchema = new mongoose.Schema(
  {
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewerName: { type: String, required: true },
    reviewerRole: { type: String, enum: ['doctor', 'admin'], default: 'admin' },
    action: {
      type: String,
      enum: ['reviewed', 'investigating', 'resolved', 'dismissed', 'status_changed'],
      required: true,
    },
    notes: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const areaAlertSchema = new mongoose.Schema(
  {
    areaKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    areaName: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    centroid: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    severity: {
      type: String,
      enum: ['watch', 'elevated', 'critical'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'under_review', 'resolved', 'dismissed'],
      default: 'active',
      index: true,
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    timeWindow: {
      type: String,
      enum: ['24h', '7d', '30d'],
      default: '7d',
    },
    uniqueUserCount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalReportCount: {
      type: Number,
      required: true,
      default: 0,
    },
    growthRate: {
      type: Number, // percentage increase vs previous period
      default: 0,
    },
    baselineExpected: {
      type: Number,
      default: 1,
    },
    primarySymptomCategories: [
      {
        category: { type: String, required: true },
        count: { type: Number, required: true },
        percentage: { type: Number, required: true },
      },
    ],
    summaryNote: {
      type: String,
      trim: true,
    },
    alertTriggeredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastEvaluatedAt: {
      type: Date,
      default: Date.now,
    },
    reviewHistory: {
      type: [reviewActionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
areaAlertSchema.index({ areaKey: 1, status: 1 });
areaAlertSchema.index({ severity: 1, status: 1, alertTriggeredAt: -1 });
areaAlertSchema.index({ centroid: '2dsphere' }, { sparse: true });

const AreaAlert =
  mongoose.models.AreaAlert || mongoose.model('AreaAlert', areaAlertSchema);

export { AreaAlert };
