import mongoose from 'mongoose';

/**
 * Pre-aggregated, privacy-filtered disease hotspot cell (Uber H3).
 * Contains ZERO patient identifiers, raw coordinates, or exact case counts.
 */
const aggregatedHotspotSchema = new mongoose.Schema(
  {
    h3Index: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resolution: {
      type: Number,
      required: true,
      min: 4,
      max: 8,
      default: 7,
    },
    disease: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    timeWindow: {
      type: String,
      enum: ['7d', '30d', '90d'],
      required: true,
      default: '7d',
      index: true,
    },
    approximateAreaName: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      default: 'Regional Zone',
      index: true,
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    caseCountRange: {
      type: String,
      required: true,
      default: 'Insufficient Data',
    },
    severity: {
      type: String,
      enum: ['high', 'moderate', 'low', 'insufficient_data'],
      required: true,
      default: 'insufficient_data',
      index: true,
    },
    trend: {
      type: String,
      enum: ['increasing', 'decreasing', 'stable', 'insufficient_data'],
      required: true,
      default: 'stable',
    },
    // Strictly the geometric center of the H3 cell, never a patient coordinate
    centroid: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    // GeoJSON Polygon of the H3 hexagon boundary
    hexBoundary: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
    preventiveMeasures: {
      type: [String],
      default: [],
    },
    isSuppressed: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSampleData: {
      type: Boolean,
      default: false,
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast map-bounds & filter queries
aggregatedHotspotSchema.index({ h3Index: 1, disease: 1, timeWindow: 1 }, { unique: true });
aggregatedHotspotSchema.index({ timeWindow: 1, isSuppressed: 1, severity: 1, disease: 1 });
aggregatedHotspotSchema.index({ centroid: '2dsphere' });

const AggregatedHotspot =
  mongoose.models.AggregatedHotspot ||
  mongoose.model('AggregatedHotspot', aggregatedHotspotSchema);

export { AggregatedHotspot };
