import express from 'express';
import * as controller from './chat.controller.js';
import { verifyAuth } from '../../middleware/authentication.middleware.js';

const router = express.Router();

router.use(verifyAuth);

router
  .route('/')
  .get(controller.getChatHistory)
  .post(controller.sendMessage)
  .delete(controller.clearChatHistory);

router.delete('/:id', controller.deleteChatMessage);

export default router;
