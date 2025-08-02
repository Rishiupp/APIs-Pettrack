import { Request, Response } from 'express';
import { NotificationService } from '../../services/notifications/notification.service';
import { ResponseHandler } from '../../utils/response';
import { ValidationUtil } from '../../utils/validation';
import { AuthRequest } from '../../types';
import { asyncHandler } from '../../middleware/error-handling';

export class NotificationsController {
  static registerDevice = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { deviceToken, platform, deviceInfo } = req.body;

    // Validate input
    const errors = ValidationUtil.validateRequired({
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
      return ResponseHandler.validationError(res, errors);
    }

    const device = await NotificationService.registerDevice(userId, {
      deviceToken,
      platform,
      deviceInfo,
    });

    return ResponseHandler.created(res, device, 'Device registered successfully');
  });

  static updatePreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const preferences = req.body;

    // Validate boolean fields
    const booleanFields = ['pushEnabled', 'emailEnabled', 'smsEnabled', 'scanNotifications', 'marketingNotifications'];
    const errors: Array<{field: string; message: string; value?: any}> = [];

    for (const field of booleanFields) {
      if (preferences[field] !== undefined && typeof preferences[field] !== 'boolean') {
        errors.push({
          field,
          message: `${field} must be a boolean`,
          value: preferences[field],
        });
      }
    }

    // Validate time format for quiet hours
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
      return ResponseHandler.validationError(res, errors);
    }

    const updatedPreferences = await NotificationService.updateNotificationPreferences(userId, preferences);
    return ResponseHandler.success(res, updatedPreferences, 'Preferences updated successfully');
  });

  static getPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const preferences = await NotificationService.getNotificationPreferences(userId);
    return ResponseHandler.success(res, preferences);
  });

  static getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { page, limit, unreadOnly } = req.query;

    const { page: validPage, limit: validLimit, errors } = ValidationUtil.validatePagination(
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const unreadOnlyBool = unreadOnly === 'true';
    const result = await NotificationService.getUserNotifications(userId, validPage, validLimit, unreadOnlyBool);
    
    return ResponseHandler.success(res, result.notifications, undefined, 200, result.meta);
  });

  static markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { notificationId } = req.params;
    const userId = req.user!.id;

    if (!notificationId) {
      return ResponseHandler.error(res, 'Notification ID is required', 400);
    }

    const notification = await NotificationService.markNotificationAsRead(notificationId, userId);
    return ResponseHandler.success(res, notification, 'Notification marked as read');
  });

  static markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const result = await NotificationService.markAllNotificationsAsRead(userId);
    return ResponseHandler.success(res, result, 'All notifications marked as read');
  });

  static deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { notificationId } = req.params;
    const userId = req.user!.id;

    if (!notificationId) {
      return ResponseHandler.error(res, 'Notification ID is required', 400);
    }

    await NotificationService.deleteNotification(notificationId, userId);
    return ResponseHandler.noContent(res);
  });

  static sendTestNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { title = 'Test Notification', message = 'This is a test notification' } = req.body;

    try {
      const result = await NotificationService.sendPushNotification(userId, {
        title,
        body: message,
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        },
      });

      return ResponseHandler.success(res, result, 'Test notification sent');
    } catch (error) {
      if (error instanceof Error && error.message.includes('No active device tokens')) {
        return ResponseHandler.error(res, 'No active devices found. Please register a device first.', 404);
      }
      throw error;
    }
  });
}