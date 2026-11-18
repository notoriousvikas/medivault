import express from 'express';
import * as controller from './user.controller.js';
import { verifyAuth } from '../../middleware/authentication.middleware.js';

const router = express.Router();

router.post('/register', controller.register);
router.post('/login', controller.login);

router.use(verifyAuth);
router.get('/me', controller.getMe);
router.route('/').get(controller.listUsers);
router
  .route('/:id')
  .get(controller.getUser)
  .patch(controller.updateUser)
  .delete(controller.deleteUser);

export default router;
