import { Router } from 'express';
import { ExecutiveController } from '../../controllers/executive/executive.controller';
import { authenticate } from '../../middleware/auth/authenticate';
import { requireExecutive, requireAdmin } from '../../middleware/auth/authorize';

const router = Router();

// All executive routes require authentication
router.use(authenticate);

// Executive operations (require executive role)
router.post('/pets/register', requireExecutive, ExecutiveController.registerPet);
router.get('/registrations', requireExecutive, ExecutiveController.getRegistrationHistory);
router.get('/stats', requireExecutive, ExecutiveController.getExecutiveStats);
router.get('/profile', requireExecutive, ExecutiveController.getProfile);
router.patch('/profile', requireExecutive, ExecutiveController.updateProfile);
router.get('/reports/daily', requireExecutive, ExecutiveController.getDailyReport);

// Admin operations for executive management
router.get('/admin/all', requireAdmin, ExecutiveController.getAllExecutives);
router.post('/admin/create', requireAdmin, ExecutiveController.createExecutive);
router.post('/admin/:executiveId/deactivate', requireAdmin, ExecutiveController.deactivateExecutive);

export default router;