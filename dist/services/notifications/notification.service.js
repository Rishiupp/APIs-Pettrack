"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const config_1 = require("../../config");
const types_1 = require("../../types");
if (!firebase_admin_1.default.apps.length && config_1.config.firebase.privateKey && config_1.config.firebase.projectId && config_1.config.firebase.clientEmail) {
    try {
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert({
                projectId: config_1.config.firebase.projectId,
                privateKey: config_1.config.firebase.privateKey,
                clientEmail: config_1.config.firebase.clientEmail,
            }),
        });
    }
    catch (error) {
        console.warn('Firebase initialization failed:', error);
    }
}
class NotificationService {
    static async registerDevice(userId, deviceData) {
        await database_1.default.deviceToken.deleteMany({
            where: {
                deviceToken: deviceData.deviceToken,
            },
        });
        const deviceToken = await database_1.default.deviceToken.create({
            data: {
                userId,
                deviceToken: deviceData.deviceToken,
                platform: deviceData.platform,
                deviceInfo: deviceData.deviceInfo || {},
                isActive: true,
            },
        });
        return deviceToken;
    }
    static async updateNotificationPreferences(userId, preferences) {
        const updatedPreferences = await database_1.default.notificationPreference.upsert({
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
    static async getNotificationPreferences(userId) {
        const preferences = await database_1.default.notificationPreference.findUnique({
            where: { userId },
        });
        if (!preferences) {
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
    static async sendPushNotification(userId, payload) {
        const deviceTokens = await database_1.default.deviceToken.findMany({
            where: {
                userId,
                isActive: true,
            },
        });
        if (deviceTokens.length === 0) {
            throw new types_1.AppError('No active device tokens found for user', 404);
        }
        const preferences = await this.getNotificationPreferences(userId);
        if (!preferences.pushEnabled) {
            throw new types_1.AppError('Push notifications disabled for user', 400);
        }
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
            if (!firebase_admin_1.default.apps.length) {
                console.warn('Firebase is not initialized. Push notifications are disabled.');
                return {
                    successCount: 0,
                    failureCount: tokens.length,
                    message: 'Firebase not configured',
                };
            }
            const response = await firebase_admin_1.default.messaging().sendEachForMulticast(message);
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success && tokens[idx]) {
                        failedTokens.push(tokens[idx]);
                    }
                });
                await database_1.default.deviceToken.updateMany({
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
        }
        catch (error) {
            console.error('Firebase push notification error:', error);
            throw new types_1.AppError('Failed to send push notification', 500);
        }
    }
    static async createNotification(data) {
        const notification = await database_1.default.notification.create({
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
        if (data.userId) {
            await this.sendNotificationThroughChannels(data.userId, notification);
        }
        return notification;
    }
    static async sendNotificationThroughChannels(userId, notification) {
        const deliveryStatus = {};
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
                        deliveryStatus.email = { success: false, message: 'Email not implemented' };
                        break;
                    case 'sms':
                        deliveryStatus.sms = { success: false, message: 'SMS not implemented' };
                        break;
                }
            }
            catch (error) {
                deliveryStatus[channel] = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }
        await database_1.default.notification.update({
            where: { id: notification.id },
            data: {
                deliveryStatus,
                sentAt: new Date(),
            },
        });
        return deliveryStatus;
    }
    static async getUserNotifications(userId, page = 1, limit = 25, unreadOnly = false) {
        const offset = (page - 1) * limit;
        const where = {
            userId,
            ...(unreadOnly && { readAt: null }),
        };
        const [notifications, total] = await Promise.all([
            database_1.default.notification.findMany({
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
            database_1.default.notification.count({ where }),
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
    static async markNotificationAsRead(notificationId, userId) {
        const notification = await database_1.default.notification.findFirst({
            where: {
                id: notificationId,
                userId,
            },
        });
        if (!notification) {
            throw new types_1.AppError('Notification not found', 404);
        }
        const updatedNotification = await database_1.default.notification.update({
            where: { id: notificationId },
            data: { readAt: new Date() },
        });
        return updatedNotification;
    }
    static async markAllNotificationsAsRead(userId) {
        const result = await database_1.default.notification.updateMany({
            where: {
                userId,
                readAt: null,
            },
            data: { readAt: new Date() },
        });
        return { updatedCount: result.count };
    }
    static async deleteNotification(notificationId, userId) {
        const notification = await database_1.default.notification.findFirst({
            where: {
                id: notificationId,
                userId,
            },
        });
        if (!notification) {
            throw new types_1.AppError('Notification not found', 404);
        }
        await database_1.default.notification.delete({
            where: { id: notificationId },
        });
        return { message: 'Notification deleted successfully' };
    }
    static isQuietHours(preferences) {
        if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
            return false;
        }
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const quietStart = preferences.quietHoursStart;
        const quietEnd = preferences.quietHoursEnd;
        if (quietStart > quietEnd) {
            return currentTime >= quietStart || currentTime <= quietEnd;
        }
        else {
            return currentTime >= quietStart && currentTime <= quietEnd;
        }
    }
    static async sendQRScanNotification(petId, scanEvent, scannerContact) {
        const pet = await database_1.default.pet.findUnique({
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
            throw new types_1.AppError('Pet not found', 404);
        }
        const scannerName = scannerContact?.name || 'Someone';
        const location = scanEvent.locationName || 'Unknown location';
        await this.createNotification({
            userId: pet.owner.userId,
            petId: pet.id,
            qrScanId: scanEvent.id,
            type: client_1.NotificationType.qr_scan,
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
    static async sendPaymentSuccessNotification(userId, paymentEvent) {
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
            type: client_1.NotificationType.payment_success,
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
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.service.js.map