import { NotificationType } from '@prisma/client';
import { NotificationPreferences, PushNotificationPayload, DeviceRegistration } from '../../types';
export declare class NotificationService {
    static registerDevice(userId: string, deviceData: DeviceRegistration): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        userId: string;
        deviceInfo: import("@prisma/client/runtime/library").JsonValue | null;
        lastUsedAt: Date;
        deviceToken: string;
        platform: import(".prisma/client").$Enums.Platform;
    }>;
    static updateNotificationPreferences(userId: string, preferences: NotificationPreferences): Promise<{
        updatedAt: Date;
        userId: string;
        pushEnabled: boolean;
        emailEnabled: boolean;
        smsEnabled: boolean;
        scanNotifications: boolean;
        marketingNotifications: boolean;
        quietHoursStart: Date | null;
        quietHoursEnd: Date | null;
        timezone: string;
    }>;
    static getNotificationPreferences(userId: string): Promise<{
        updatedAt: Date;
        userId: string;
        pushEnabled: boolean;
        emailEnabled: boolean;
        smsEnabled: boolean;
        scanNotifications: boolean;
        marketingNotifications: boolean;
        quietHoursStart: Date | null;
        quietHoursEnd: Date | null;
        timezone: string;
    } | {
        pushEnabled: boolean;
        emailEnabled: boolean;
        smsEnabled: boolean;
        scanNotifications: boolean;
        marketingNotifications: boolean;
        quietHoursStart: null;
        quietHoursEnd: null;
        timezone: string;
    }>;
    static sendPushNotification(userId: string, payload: PushNotificationPayload): Promise<{
        message: string;
        successCount?: undefined;
        failureCount?: undefined;
        tokens?: undefined;
    } | {
        successCount: number;
        failureCount: number;
        message: string;
        tokens?: undefined;
    } | {
        successCount: number;
        failureCount: number;
        tokens: number;
        message?: undefined;
    }>;
    static createNotification(data: {
        userId?: string;
        petId?: string;
        qrScanId?: string;
        type: NotificationType;
        title: string;
        message: string;
        channels?: string[];
        metadata?: any;
    }): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        userId: string | null;
        petId: string | null;
        qrScanId: string | null;
        notificationType: import(".prisma/client").$Enums.NotificationType;
        title: string;
        channels: string[];
        deliveryStatus: import("@prisma/client/runtime/library").JsonValue | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        sentAt: Date | null;
        readAt: Date | null;
    }>;
    static sendNotificationThroughChannels(userId: string, notification: any): Promise<any>;
    static getUserNotifications(userId: string, page?: number, limit?: number, unreadOnly?: boolean): Promise<{
        notifications: ({
            pet: {
                name: string;
                id: string;
            } | null;
        } & {
            message: string;
            id: string;
            createdAt: Date;
            userId: string | null;
            petId: string | null;
            qrScanId: string | null;
            notificationType: import(".prisma/client").$Enums.NotificationType;
            title: string;
            channels: string[];
            deliveryStatus: import("@prisma/client/runtime/library").JsonValue | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            sentAt: Date | null;
            readAt: Date | null;
        })[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    static markNotificationAsRead(notificationId: string, userId: string): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        userId: string | null;
        petId: string | null;
        qrScanId: string | null;
        notificationType: import(".prisma/client").$Enums.NotificationType;
        title: string;
        channels: string[];
        deliveryStatus: import("@prisma/client/runtime/library").JsonValue | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        sentAt: Date | null;
        readAt: Date | null;
    }>;
    static markAllNotificationsAsRead(userId: string): Promise<{
        updatedCount: number;
    }>;
    static deleteNotification(notificationId: string, userId: string): Promise<{
        message: string;
    }>;
    private static isQuietHours;
    static sendQRScanNotification(petId: string, scanEvent: any, scannerContact?: any): Promise<void>;
    static sendPaymentSuccessNotification(userId: string, paymentEvent: any): Promise<void>;
}
//# sourceMappingURL=notification.service.d.ts.map