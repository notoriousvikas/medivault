import express from 'express';
import * as controller from './consultation.controller.js';
import { verifyAuth } from '../../middleware/authentication.middleware.js';

const router = express.Router();

router.use(verifyAuth);

// Doctors directory for consultation
router.get('/doctors', controller.getDoctors);

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
