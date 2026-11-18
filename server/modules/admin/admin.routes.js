import express from 'express';
import * as controller from './admin.controller.js';
import { verifyAuth } from '../../middleware/authentication.middleware.js';
import { authorizeRoles } from '../../middleware/authorization.middleware.js';

const router = express.Router();

// Require both authentication and admin role for all routes in this router
router.use(verifyAuth);
router.use(authorizeRoles('admin'));

// System metrics and dashboard overview
router.get('/overview', controller.getDashboardOverview);
router.get('/stats', controller.getDashboardOverview);

// Doctor verification and management
router.get('/doctors', controller.getAllDoctors);
router.get('/doctors/pending', controller.getPendingDoctors);
router.patch('/doctors/:id/verify', controller.verifyDoctor);

// User management
router.get('/users', controller.getAllUsers);
router.get('/users/:id', controller.getUserById);
router.patch('/users/:id/role', controller.updateUserRole);
router.delete('/users/:id', controller.deleteUser);

// Platform-wide medical data access
router.get('/records', controller.getAllRecords);
router.get('/prescriptions', controller.getAllPrescriptions);
router.get('/timeline-events', controller.getAllTimelineEvents);

export default router;
