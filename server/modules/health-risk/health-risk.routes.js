import express from 'express';
import { verifyAuth } from '../../middleware/authentication.middleware.js';
import { authorizeRoles } from '../../middleware/authorization.middleware.js';
import * as controller from './health-risk.controller.js';

const router = express.Router();

// All health risk endpoints require active authentication
router.use(verifyAuth);

// Patient symptom reporting
router.post('/reports', controller.submitHealthReport);
router.get('/reports/my', controller.getMyHealthReports);
router.get('/taxonomy', controller.getTaxonomy);

// Area-level analytics and alerts (privacy-preserving, no patient PII)
router.get('/alerts', controller.listAreaAlerts);
router.get('/overview', controller.getOverview);
router.get('/clusters', controller.listClusters);

// Doctor & Admin review and cluster scanning controls
router.patch(
  '/alerts/:id/status',
  authorizeRoles('doctor', 'admin'),
  controller.updateAlertStatus
);

router.post(
  '/scan',
  authorizeRoles('doctor', 'admin'),
  controller.triggerClusterScan
);

export default router;
