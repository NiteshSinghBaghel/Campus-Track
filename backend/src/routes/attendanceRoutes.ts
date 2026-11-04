import { Router } from 'express';
import { attendanceController } from '../controllers/attendanceController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/one-scan', attendanceController.processOneScan);
router.get('/:accountId', attendanceController.getAccountAttendance);
router.get('/:accountId/profile', attendanceController.getProfile);
router.get('/:accountId/timetable', attendanceController.getTimetable);
router.get('/:accountId/results', attendanceController.getResults);

export default router;

