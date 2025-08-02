import { OTPPurpose } from '@prisma/client';
export declare class AuthService {
    static requestOTP(phone: string, purpose: OTPPurpose): Promise<{
        message: string;
        expiresIn: number;
    }>;
    static verifyOTPAndLogin(phone: string, code: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            phone: string | null;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            emailVerified: boolean;
            phoneVerified: boolean;
        };
    }>;
    static register(userData: {
        phone: string;
        email: string;
        firstName: string;
        lastName: string;
        otpCode: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            phone: string | null;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            emailVerified: boolean;
            phoneVerified: boolean;
        };
    }>;
    static refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            phone: string | null;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            emailVerified: boolean;
            phoneVerified: boolean;
        };
    }>;
    static logout(userId: string, refreshToken: string): Promise<{
        message: string;
    }>;
    static logoutAllSessions(userId: string): Promise<{
        message: string;
    }>;
    static getUserProfile(userId: string): Promise<{
        id: string;
        email: string;
        phone: string | null;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.UserRole;
        emailVerified: boolean;
        phoneVerified: boolean;
        lastLogin: Date | null;
        createdAt: Date;
        petOwner: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            countryCode: string;
            state: string | null;
            city: string | null;
            addressLine1: string | null;
            addressLine2: string | null;
            postalCode: string | null;
            emergencyContactName: string | null;
            emergencyContactPhone: string | null;
        } | null;
        executive: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            userId: string;
            employeeId: string;
            territory: string | null;
        } | null;
        notificationPreferences: {
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
        } | null;
    }>;
}
//# sourceMappingURL=auth.service.d.ts.map