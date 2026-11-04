import { Router } from 'express';
import { accountController } from '../controllers/accountController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', accountController.getAccounts);
router.post('/link', accountController.linkAccount);
router.post('/:id/sync', accountController.syncAccount);
router.delete('/:id', accountController.deleteAccount);

export default router;

