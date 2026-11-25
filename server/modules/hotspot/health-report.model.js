import mongoose from 'mongoose';

const healthReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rawSymptoms: {
      type: [String],
      default: [],
    },
    normalizedCategories: {
      type: [String],
      default: [],
      index: true,
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      default: 'moderate',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    area: {
      locality: { type: String, trim: true },
      city: { type: String, trim: true, default: 'Unknown City', index: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: 'India' },
      postalCode: { type: String, trim: true, index: true },
    },
    // Normalized grouping key e.g. "bengaluru:koramangala" or "delhi:110001"
    areaKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    // Approximate centroid or report coordinate (2dsphere)
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    reportedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'dismissed'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for time-series geospatial/locality window analysis
healthReportSchema.index({ areaKey: 1, reportedAt: -1 });
healthReportSchema.index({ 'area.city': 1, reportedAt: -1 });
healthReportSchema.index({ userId: 1, reportedAt: -1 });
healthReportSchema.index({ location: '2dsphere' }, { sparse: true });

const HealthReport =
  mongoose.models.HealthReport || mongoose.model('HealthReport', healthReportSchema);

export { HealthReport };
