import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', authController.primaryLogin);
router.get('/me', authMiddleware, authController.getMe);

export default router;
