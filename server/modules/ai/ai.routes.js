import express from 'express';
import * as controller from './ai.controller.js';
import { verifyAuth } from '../../middleware/authentication.middleware.js';
import documentUpload from '../../middleware/documentUpload.middleware.js';

const router = express.Router();

// Public health check of the AI microservice
router.get('/health', controller.getHealth);

// Authenticated direct analysis
router.post(
  '/analyze-xray',
  verifyAuth,
  documentUpload.single('file'),
  controller.analyzeChestXRayDirect
);

export default router;
