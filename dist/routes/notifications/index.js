"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notifications_controller_1 = require("../../controllers/notifications/notifications.controller");
const authenticate_1 = require("../../middleware/auth/authenticate");
const authorize_1 = require("../../middleware/auth/authorize");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate);
router.use(authorize_1.requireAuthenticated);
router.get('/', notifications_controller_1.NotificationsController.getNotifications);
router.patch('/:notificationId/read', notifications_controller_1.NotificationsController.markAsRead);
router.patch('/read-all', notifications_controller_1.NotificationsController.markAllAsRead);
router.delete('/:notificationId', notifications_controller_1.NotificationsController.deleteNotification);
router.get('/preferences', notifications_controller_1.NotificationsController.getPreferences);
router.patch('/preferences', notifications_controller_1.NotificationsController.updatePreferences);
router.post('/devices/register', notifications_controller_1.NotificationsController.registerDevice);
if (process.env.NODE_ENV === 'development') {
    router.post('/test', notifications_controller_1.NotificationsController.sendTestNotification);
}
exports.default = router;
//# sourceMappingURL=index.js.map