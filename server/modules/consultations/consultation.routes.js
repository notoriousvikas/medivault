import express from 'express';
import * as controller from './consultation.controller.js';
import { verifyAuth } from '../../middleware/authentication.middleware.js';

const router = express.Router();

router.use(verifyAuth);

// Doctors directory for consultation
router.get('/doctors', controller.getDoctors);

// Patient-only: Get dedicated registration QR code for doctor scanning
router.get('/patient-qr', controller.getPatientRegistrationQR);

// Doctor-only: Scan patient QR or token to admit to consultation
router.post('/scan-patient', controller.scanAndAddPatient);

// Consultations list & create/get conversation
router
  .route('/')
  .get(controller.getConsultations)
  .post(controller.startOrGetConsultation);

// Messages in a consultation
router
  .route('/:id/messages')
  .get(controller.getMessages)
  .post(controller.sendMessage);

export default router;
