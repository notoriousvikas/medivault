import express from 'express';
import * as controller from './appointment.controller.js';
import { verifyAuth } from '../../middleware/authentication.middleware.js';

const router = express.Router();

// All appointment routes require authentication
router.use(verifyAuth);

// Auto-book based on DenseNet-121 X-ray triage
router.post('/auto-book-xray', controller.autoBookXRayAppointment);

// Doctor availability & schedule configuration
router.get('/doctor/availability', controller.getDoctorAvailability);
router.patch('/doctor/availability', controller.updateDoctorAvailability);

// Doctor available time slots on a specific date
router.get('/doctor-slots/:doctorId', controller.getDoctorSlots);

// Standard appointment booking & management
router.route('/')
  .post(controller.createAppointment)
  .get(controller.listAppointments);

router.route('/:id')
  .get(controller.getAppointment);

router.patch('/:id/status', controller.updateAppointmentStatus);

export default router;
