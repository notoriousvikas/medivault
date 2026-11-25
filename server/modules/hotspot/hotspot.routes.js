import express from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAuth } from '../../middleware/authentication.middleware.js';
import { authorizeRoles } from '../../middleware/authorization.middleware.js';
import * as controller from './hotspot.controller.js';

const router = express.Router();

// Rate limiter to prevent differencing / repeated probing attacks
const hotspotRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // max 60 hotspot requests per minute per IP/user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: {
    status: 'fail',
    message: 'Too many hotspot queries. Please wait a moment before trying again.',
  },
});

router.use(verifyAuth);
router.use(hotspotRateLimiter);

// Health symptom report ingestion (feeds H3 hotspot aggregation)
router.post('/reports', controller.submitHealthReport);

// Publicly-safe aggregated hotspot endpoints (authenticated users)
router.get('/hotspots', controller.listHotspots);
router.get('/hotspots/summary', controller.getSummary);
router.get('/hotspots/:id', controller.getHotspotDetails);

// Smart Jagruti nearby alerts & notification preferences
router.get('/nearby-alerts', controller.getNearbyHealthAlerts);
router.get('/preferences', controller.getAlertPreferences);
router.patch('/preferences', controller.updateAlertPreferences);

// Medical staff / Admin aggregation controls
router.post(
  '/hotspots/refresh',
  authorizeRoles('doctor', 'admin'),
  controller.triggerRefresh
);

// Development-only sample data seeder
router.post(
  '/hotspots/seed-sample',
  authorizeRoles('doctor', 'admin'),
  controller.triggerSampleSeed
);

export default router;
