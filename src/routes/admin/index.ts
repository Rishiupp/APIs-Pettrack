import { Router } from 'express';
import { AdminController } from '../../controllers/admin/admin.controller';
import { authenticate } from '../../middleware/auth/authenticate';
import { requireAdmin } from '../../middleware/auth/authorize';

const router = Router();

// All admin routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Dashboard and overview
router.get('/dashboard/overview', AdminController.getDashboardOverview);
router.get('/system/stats', AdminController.getSystemStats);

// Analytics endpoints
router.get('/analytics/pets', AdminController.getPetAnalytics);
router.get('/analytics/qr', AdminController.getQRAnalytics);
router.get('/analytics/revenue', AdminController.getRevenueAnalytics);
router.get('/analytics/users', AdminController.getUserAnalytics);

// QR code management
router.get('/qr-codes/pools', AdminController.getQRCodePools);
router.post('/qr-codes/pools', AdminController.createQRCodePool);
router.post('/qr-codes/generate', AdminController.generateQRCodes);

// User management
router.get('/users', AdminController.getAllUsers);
router.post('/users/:userId/suspend', AdminController.suspendUser);
router.post('/users/:userId/reactivate', AdminController.reactivateUser);

export default router;