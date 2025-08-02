"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const notification_service_1 = require("../../services/notifications/notification.service");
const response_1 = require("../../utils/response");
const validation_1 = require("../../utils/validation");
const error_handling_1 = require("../../middleware/error-handling");
class NotificationsController {
}
exports.NotificationsController = NotificationsController;
_a = NotificationsController;
NotificationsController.registerDevice = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { deviceToken, platform, deviceInfo } = req.body;
    const errors = validation_1.ValidationUtil.validateRequired({
        deviceToken,
        platform,
    });
    const validPlatforms = ['ios', 'android', 'web'];
    if (!validPlatforms.includes(platform)) {
        errors.push({
            field: 'platform',
            message: 'Invalid platform',
            value: platform,
        });
    }
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const device = await notification_service_1.NotificationService.registerDevice(userId, {
        deviceToken,
        platform,
        deviceInfo,
    });
    return response_1.ResponseHandler.created(res, device, 'Device registered successfully');
});
NotificationsController.updatePreferences = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const preferences = req.body;
    const booleanFields = ['pushEnabled', 'emailEnabled', 'smsEnabled', 'scanNotifications', 'marketingNotifications'];
    const errors = [];
    for (const field of booleanFields) {
        if (preferences[field] !== undefined && typeof preferences[field] !== 'boolean') {
            errors.push({
                field,
                message: `${field} must be a boolean`,
                value: preferences[field],
            });
        }
    }
    if (preferences.quietHoursStart && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(preferences.quietHoursStart)) {
        errors.push({
            field: 'quietHoursStart',
            message: 'Invalid time format (HH:MM expected)',
            value: preferences.quietHoursStart,
        });
    }
    if (preferences.quietHoursEnd && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(preferences.quietHoursEnd)) {
        errors.push({
            field: 'quietHoursEnd',
            message: 'Invalid time format (HH:MM expected)',
            value: preferences.quietHoursEnd,
        });
    }
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const updatedPreferences = await notification_service_1.NotificationService.updateNotificationPreferences(userId, preferences);
    return response_1.ResponseHandler.success(res, updatedPreferences, 'Preferences updated successfully');
});
NotificationsController.getPreferences = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const preferences = await notification_service_1.NotificationService.getNotificationPreferences(userId);
    return response_1.ResponseHandler.success(res, preferences);
});
NotificationsController.getNotifications = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { page, limit, unreadOnly } = req.query;
    const { page: validPage, limit: validLimit, errors } = validation_1.ValidationUtil.validatePagination(page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const unreadOnlyBool = unreadOnly === 'true';
    const result = await notification_service_1.NotificationService.getUserNotifications(userId, validPage, validLimit, unreadOnlyBool);
    return response_1.ResponseHandler.success(res, result.notifications, undefined, 200, result.meta);
});
NotificationsController.markAsRead = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user.id;
    if (!notificationId) {
        return response_1.ResponseHandler.error(res, 'Notification ID is required', 400);
    }
    const notification = await notification_service_1.NotificationService.markNotificationAsRead(notificationId, userId);
    return response_1.ResponseHandler.success(res, notification, 'Notification marked as read');
});
NotificationsController.markAllAsRead = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const result = await notification_service_1.NotificationService.markAllNotificationsAsRead(userId);
    return response_1.ResponseHandler.success(res, result, 'All notifications marked as read');
});
NotificationsController.deleteNotification = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user.id;
    if (!notificationId) {
        return response_1.ResponseHandler.error(res, 'Notification ID is required', 400);
    }
    await notification_service_1.NotificationService.deleteNotification(notificationId, userId);
    return response_1.ResponseHandler.noContent(res);
});
NotificationsController.sendTestNotification = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { title = 'Test Notification', message = 'This is a test notification' } = req.body;
    try {
        const result = await notification_service_1.NotificationService.sendPushNotification(userId, {
            title,
            body: message,
            data: {
                type: 'test',
                timestamp: new Date().toISOString(),
            },
        });
        return response_1.ResponseHandler.success(res, result, 'Test notification sent');
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('No active device tokens')) {
            return response_1.ResponseHandler.error(res, 'No active devices found. Please register a device first.', 404);
        }
        throw error;
    }
});
//# sourceMappingURL=notifications.controller.js.map