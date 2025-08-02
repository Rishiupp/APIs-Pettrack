import { UserRole } from '@prisma/client';
import { DashboardOverview, AnalyticsQuery } from '../../types';
export declare class AdminService {
    static getDashboardOverview(): Promise<DashboardOverview>;
    static getPetAnalytics(query: AnalyticsQuery): Promise<{
        registrations: unknown;
        bySpecies: {
            species: string;
            count: number;
        }[];
    }>;
    static getQRAnalytics(query: AnalyticsQuery): Promise<{
        scans: unknown;
        statusBreakdown: {
            status: import(".prisma/client").$Enums.QRStatus;
            count: number;
        }[];
    }>;
    static getRevenueAnalytics(query: AnalyticsQuery): Promise<{
        revenue: unknown;
        byPurpose: {
            purpose: import(".prisma/client").$Enums.PaymentPurpose;
            revenue: number;
            transactions: number;
        }[];
    }>;
    static getUserAnalytics(query: AnalyticsQuery): Promise<{
        registrations: unknown;
        byRole: {
            role: import(".prisma/client").$Enums.UserRole;
            count: number;
        }[];
    }>;
    static createQRCodePool(poolName: string, totalCapacity: number): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.PoolStatus;
        poolName: string;
        totalCapacity: number;
        usedCount: number;
    }>;
    static generateQRCodes(poolId: string, quantity: number): Promise<{
        created: number;
        codes: {
            poolId: string;
            qrCodeString: string;
            qrCodeHash: string;
            qrImageUrl: string;
        }[];
    }>;
    static getQRCodePools(page?: number, limit?: number): Promise<{
        pools: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.PoolStatus;
            poolName: string;
            totalCapacity: number;
            usedCount: number;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    static getAllUsers(page?: number, limit?: number, filters?: {
        role?: UserRole;
        status?: 'active' | 'inactive';
    }): Promise<{
        users: {
            executive: {
                id: string;
                employeeId: string;
                territory: string | null;
            } | null;
            email: string;
            phone: string | null;
            id: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
            emailVerified: boolean;
            phoneVerified: boolean;
            lastLogin: Date | null;
            createdAt: Date;
            petOwner: {
                id: string;
                state: string | null;
                city: string | null;
            } | null;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    static suspendUser(userId: string, reason: string, notifyUser?: boolean): Promise<{
        user: {
            email: string;
            phone: string | null;
            id: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
            emailVerified: boolean;
            phoneVerified: boolean;
            lastLogin: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        message: string;
    }>;
    static reactivateUser(userId: string): Promise<{
        user: {
            email: string;
            phone: string | null;
            id: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
            emailVerified: boolean;
            phoneVerified: boolean;
            lastLogin: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        message: string;
    }>;
    static getSystemStats(): Promise<{
        users: {
            total: number;
            active: number;
        };
        pets: {
            total: number;
            active: number;
        };
        qrCodes: {
            total: number;
            assigned: number;
        };
        scans: {
            total: number;
            successful: number;
        };
        revenue: {
            total: number;
        };
        support: {
            openTickets: number;
        };
    }>;
}
//# sourceMappingURL=admin.service.d.ts.map