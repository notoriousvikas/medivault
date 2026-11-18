import express from 'express';
import * as controller from './prescription.controller.js';
import { verifyAuth } from '../../middleware/authentication.middleware.js';

const router = express.Router();

router.use(verifyAuth);

router
  .route('/')
  .get(controller.listPrescriptions)
  .post(controller.createPrescription);

// Groq RAG prescription analysis
router
  .route('/:id/analyze')
  .get(controller.analyzePrescription)
  .post(controller.analyzePrescription);

router
  .route('/:id')
  .get(controller.getPrescription)
  .patch(controller.updatePrescription)
  .delete(controller.deletePrescription);

export default router;
