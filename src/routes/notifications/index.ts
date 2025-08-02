import { Router } from 'express';
import { NotificationsController } from '../../controllers/notifications/notifications.controller';
import { authenticate } from '../../middleware/auth/authenticate';
import { requireAuthenticated } from '../../middleware/auth/authorize';

const router = Router();

// All notification routes require authentication
router.use(authenticate);
router.use(requireAuthenticated);

// Notification management
router.get('/', NotificationsController.getNotifications);
router.patch('/:notificationId/read', NotificationsController.markAsRead);
router.patch('/read-all', NotificationsController.markAllAsRead);
router.delete('/:notificationId', NotificationsController.deleteNotification);

// Notification preferences
router.get('/preferences', NotificationsController.getPreferences);
router.patch('/preferences', NotificationsController.updatePreferences);

// Device management
router.post('/devices/register', NotificationsController.registerDevice);

// Test notification (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/test', NotificationsController.sendTestNotification);
}

export default router;