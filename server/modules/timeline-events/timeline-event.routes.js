import express from 'express';
import * as controller from './timeline-event.controller.js';
import { verifyAuth } from '../../middleware/authentication.middleware.js';

const router = express.Router();

router.use(verifyAuth);

router
  .route('/')
  .get(controller.listTimelineEvents)
  .post(controller.createTimelineEvent);
router
  .route('/:id')
  .get(controller.getTimelineEvent)
  .patch(controller.updateTimelineEvent)
  .delete(controller.deleteTimelineEvent);

export default router;
