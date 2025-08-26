import admin from 'firebase-admin';
import { NotificationType, Platform } from '@prisma/client';
import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../types';
import { NotificationPreferences, PushNotificationPayload, DeviceRegistration } from '../../types';
import { SMSService } from '../sms/sms.service';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    if (!config.firebase.projectId || !config.firebase.privateKey || !config.firebase.clientEmail) {
      console.error('Firebase configuration missing. Push notifications will be disabled.');
      console.error('Missing:', {
        projectId: !config.firebase.projectId,
        privateKey: !config.firebase.privateKey,
        clientEmail: !config.firebase.clientEmail
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          privateKey: config.firebase.privateKey,
          clientEmail: config.firebase.clientEmail,
        }),
      });
      console.log('✓ Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
}

export class NotificationService {
  static async registerDevice(userId: string, deviceData: DeviceRegistration) {
    // Remove existing device token if it exists
    await prisma.deviceToken.deleteMany({
      where: {
        deviceToken: deviceData.deviceToken,
      },
    });

    // Create new device token record
    const deviceToken = await prisma.deviceToken.create({
      data: {
        userId,
        deviceToken: deviceData.deviceToken,
        platform: deviceData.platform as Platform,
        deviceInfo: deviceData.deviceInfo || {},
        isActive: true,
      },
    });

    return deviceToken;
  }

  static async updateNotificationPreferences(userId: string, preferences: NotificationPreferences) {
    const updatedPreferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        pushEnabled: preferences.pushEnabled,
        emailEnabled: preferences.emailEnabled,
        smsEnabled: preferences.smsEnabled,
        scanNotifications: preferences.scanNotifications,
        marketingNotifications: preferences.marketingNotifications,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        timezone: preferences.timezone,
      },
      create: {
        userId,
        pushEnabled: preferences.pushEnabled,
        emailEnabled: preferences.emailEnabled,
        smsEnabled: preferences.smsEnabled,
        scanNotifications: preferences.scanNotifications,
        marketingNotifications: preferences.marketingNotifications,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        timezone: preferences.timezone,
      },
    });

    return updatedPreferences;
  }

  static async getNotificationPreferences(userId: string) {
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Return default preferences
      return {
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        scanNotifications: true,
        marketingNotifications: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: 'Asia/Kolkata',
      };
    }

    return preferences;
  }

  static async sendPushNotification(userId: string, payload: PushNotificationPayload) {
    // Get user's device tokens
    const deviceTokens = await prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (deviceTokens.length === 0) {
      throw new AppError('No active device tokens found for user', 404);
    }

    // Check user's notification preferences
    const preferences = await this.getNotificationPreferences(userId);
    if (!preferences.pushEnabled) {
      throw new AppError('Push notifications disabled for user', 400);
    }

    // Check quiet hours
    if (this.isQuietHours(preferences)) {
      console.log(`Skipping notification for user ${userId} - quiet hours`);
      return { message: 'Notification skipped - quiet hours' };
    }

    const tokens = deviceTokens.map(dt => dt.deviceToken);
    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data || {},
      tokens,
    };

    try {
      if (!admin.apps.length) {
        console.error('Firebase Admin SDK is not initialized. Push notifications are disabled.');
        throw new AppError('Firebase not configured - push notifications unavailable', 503);
      }

      console.log('Sending push notification to', tokens.length, 'devices');
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log('Push notification response:', {
        successCount: response.successCount,
        failureCount: response.failureCount
      });
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && tokens[idx]) {
            failedTokens.push(tokens[idx]);
          }
        });

        // Deactivate failed tokens
        await prisma.deviceToken.updateMany({
          where: {
            deviceToken: { in: failedTokens },
          },
          data: { isActive: false },
        });
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        tokens: tokens.length,
      };
    } catch (error) {
      console.error('Firebase push notification error:', error);
      throw new AppError('Failed to send push notification', 500);
    }
  }

  static async createNotification(data: {
    userId?: string;
    petId?: string;
    qrScanId?: string;
    type: NotificationType;
    title: string;
    message: string;
    channels?: string[];
    metadata?: any;
  }) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        petId: data.petId,
        qrScanId: data.qrScanId,
        notificationType: data.type,
        title: data.title,
        message: data.message,
        channels: data.channels || ['push'],
        metadata: data.metadata || {},
      },
    });

    // Send the notification through specified channels
    if (data.userId) {
      await this.sendNotificationThroughChannels(data.userId, notification);
    }

    return notification;
  }

  static async sendNotificationThroughChannels(userId: string, notification: any) {
    const deliveryStatus: any = {};

    // Get user data for SMS
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    for (const channel of notification.channels) {
      try {
        switch (channel) {
          case 'push':
            const pushResult = await this.sendPushNotification(userId, {
              title: notification.title,
              body: notification.message,
              data: {
                notificationId: notification.id,
                type: notification.notificationType,
                ...(notification.metadata || {}),
              },
            });
            deliveryStatus.push = { success: true, ...pushResult };
            break;

          case 'email':
            // TODO: Implement email notification
            deliveryStatus.email = { success: false, message: 'Email not implemented' };
            break;

          case 'sms':
            if (user?.phone) {
              const smsContent = `${notification.title}: ${notification.message}`;
              const success = await SMSService.sendSMS(user.phone, smsContent);
              deliveryStatus.sms = { 
                success, 
                message: success ? 'SMS sent successfully' : 'SMS failed to send' 
              };
            } else {
              deliveryStatus.sms = { success: false, message: 'No phone number available' };
            }
            break;
        }
      } catch (error) {
        deliveryStatus[channel] = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }

    // Update notification with delivery status
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        deliveryStatus,
        sentAt: new Date(),
      },
    });

    return deliveryStatus;
  }

  static async getUserNotifications(userId: string, page: number = 1, limit: number = 25, unreadOnly: boolean = false) {
    const offset = (page - 1) * limit;
    const where = {
      userId,
      ...(unreadOnly && { readAt: null }),
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          pet: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    const meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };

    return { notifications, meta };
  }

  static async markNotificationAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return updatedNotification;
  }

  static async markAllNotificationsAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { updatedCount: result.count };
  }

  static async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification deleted successfully' };
  }

  // Helper method to check if current time is within quiet hours
  private static isQuietHours(preferences: any): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    const quietStart = preferences.quietHoursStart;
    const quietEnd = preferences.quietHoursEnd;

    // Handle quiet hours that span midnight
    if (quietStart > quietEnd) {
      return currentTime >= quietStart || currentTime <= quietEnd;
    } else {
      return currentTime >= quietStart && currentTime <= quietEnd;
    }
  }

  // Send QR scan notification to pet owner
  static async sendQRScanNotification(petId: string, scanEvent: any, scannerContact?: any) {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: {
        owner: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!pet) {
      throw new AppError('Pet not found', 404);
    }

    const scannerName = scannerContact?.name || 'Someone';
    const location = scanEvent.locationName || 'Unknown location';

    await this.createNotification({
      userId: pet.owner.userId,
      petId: pet.id,
      qrScanId: scanEvent.id,
      type: NotificationType.qr_scan,
      title: `${pet.name} was scanned!`,
      message: `${scannerName} scanned ${pet.name}'s QR code at ${location}`,
      channels: ['push', 'email'],
      metadata: {
        scanTimestamp: scanEvent.scanTimestamp,
        location: scanEvent.locationName,
        scannerContact,
      },
    });
  }

  // Send payment success notification
  static async sendPaymentSuccessNotification(userId: string, paymentEvent: any) {
    const purpose = paymentEvent.paymentPurpose;
    let message = `Payment of ₹${paymentEvent.amount} successful`;

    switch (purpose) {
      case 'qr_registration':
        message = `QR code registration payment of ₹${paymentEvent.amount} successful`;
        break;
      case 'premium_features':
        message = `Premium features payment of ₹${paymentEvent.amount} successful`;
        break;
      case 'vet_consultation':
        message = `Vet consultation payment of ₹${paymentEvent.amount} successful`;
        break;
    }

    await this.createNotification({
      userId,
      type: NotificationType.payment_success,
      title: 'Payment Successful',
      message,
      channels: ['push', 'email'],
      metadata: {
        paymentEventId: paymentEvent.id,
        amount: paymentEvent.amount,
        purpose: paymentEvent.paymentPurpose,
      },
    });
  }
}