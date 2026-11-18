import express from 'express';
import * as controller from './emergency.controller.js';
import { verifyAuth } from '../../middleware/authentication.middleware.js';

const router = express.Router();

// Authenticated user emergency profile management
router.get('/me', verifyAuth, controller.getMyEmergencyProfile);
router.get('/me/qr', verifyAuth, controller.getEmergencyQRCode);
router.patch('/me', verifyAuth, controller.updateEmergencyInfo);
router.post('/me/regenerate-token', verifyAuth, controller.regenerateEmergencyToken);
router.get('/me/logs', verifyAuth, controller.getEmergencyAccessLogs);

// Public emergency access (scanned by QR code / first responders)
router.get('/:token', controller.getEmergencyProfileByToken);

export default router;
