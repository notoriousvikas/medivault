import express from 'express';
import * as controller from './record.controller.js';
import { verifyAuth } from '../../middleware/authentication.middleware.js';
import documentUpload from '../../middleware/documentUpload.middleware.js';

const router = express.Router();

router.use(verifyAuth);

router
  .route('/')
  .get(controller.listRecords)
  .post(documentUpload.single('file'), controller.createRecord);

// Groq RAG medical record / report analysis
router
  .route('/:id/analyze')
  .get(controller.analyzeRecord)
  .post(controller.analyzeRecord);

router
  .route('/:id')
  .get(controller.getRecord)
  .patch(documentUpload.single('file'), controller.updateRecord)
  .delete(controller.deleteRecord);

export default router;
