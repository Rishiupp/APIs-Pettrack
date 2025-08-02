"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const types_1 = require("../../types");
const qr_service_1 = require("../qr/qr.service");
class AdminService {
    static async getDashboardOverview() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const [totalPets, activePets, totalUsers, qrCodesAssigned, scansToday, revenueThisMonth,] = await Promise.all([
            database_1.default.pet.count(),
            database_1.default.pet.count({ where: { status: client_1.PetStatus.active } }),
            database_1.default.user.count({ where: { isActive: true } }),
            database_1.default.qRCode.count({ where: { status: { in: [client_1.QRStatus.assigned, client_1.QRStatus.active] } } }),
            database_1.default.qRScanEvent.count({
                where: {
                    scanTimestamp: { gte: startOfToday },
                    scanResult: 'success',
                },
            }),
            database_1.default.paymentEvent.aggregate({
                where: {
                    status: client_1.PaymentStatus.success,
                    completedAt: { gte: startOfMonth },
                },
                _sum: { amount: true },
            }),
        ]);
        return {
            totalPets,
            activePets,
            totalUsers,
            qrCodesAssigned,
            scansToday,
            revenueThisMonth: Number(revenueThisMonth._sum.amount) || 0,
        };
    }
    static async getPetAnalytics(query) {
        const { period, groupBy } = query;
        const now = new Date();
        let startDate;
        switch (period) {
            case '24h':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        let dateFormat;
        switch (groupBy) {
            case 'hour':
                dateFormat = 'YYYY-MM-DD HH24:00:00';
                break;
            case 'day':
                dateFormat = 'YYYY-MM-DD';
                break;
            case 'week':
                dateFormat = 'YYYY-"W"WW';
                break;
            case 'month':
                dateFormat = 'YYYY-MM';
                break;
            default:
                dateFormat = 'YYYY-MM-DD';
        }
        const petRegistrations = await database_1.default.$queryRaw `
      SELECT 
        TO_CHAR(created_at, ${dateFormat}) as period,
        COUNT(*)::integer as count
      FROM pets 
      WHERE created_at >= ${startDate}
      GROUP BY TO_CHAR(created_at, ${dateFormat})
      ORDER BY period ASC
    `;
        const petsBySpecies = await database_1.default.pet.groupBy({
            by: ['speciesId'],
            where: { createdAt: { gte: startDate } },
            _count: true,
        });
        const speciesData = await Promise.all(petsBySpecies.map(async (item) => {
            const species = await database_1.default.petSpecies.findUnique({
                where: { id: item.speciesId },
                select: { speciesName: true },
            });
            return {
                species: species?.speciesName || 'Unknown',
                count: item._count,
            };
        }));
        return {
            registrations: petRegistrations,
            bySpecies: speciesData,
        };
    }
    static async getQRAnalytics(query) {
        const { period, groupBy } = query;
        const now = new Date();
        let startDate;
        switch (period) {
            case '24h':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        let dateFormat;
        switch (groupBy) {
            case 'hour':
                dateFormat = 'YYYY-MM-DD HH24:00:00';
                break;
            case 'day':
                dateFormat = 'YYYY-MM-DD';
                break;
            case 'week':
                dateFormat = 'YYYY-"W"WW';
                break;
            case 'month':
                dateFormat = 'YYYY-MM';
                break;
            default:
                dateFormat = 'YYYY-MM-DD';
        }
        const scanEvents = await database_1.default.$queryRaw `
      SELECT 
        TO_CHAR(scan_timestamp, ${dateFormat}) as period,
        COUNT(*)::integer as count,
        COUNT(CASE WHEN scan_result = 'success' THEN 1 END)::integer as successful_scans
      FROM qr_scan_events 
      WHERE scan_timestamp >= ${startDate}
      GROUP BY TO_CHAR(scan_timestamp, ${dateFormat})
      ORDER BY period ASC
    `;
        const qrStatusBreakdown = await database_1.default.qRCode.groupBy({
            by: ['status'],
            _count: true,
        });
        return {
            scans: scanEvents,
            statusBreakdown: qrStatusBreakdown.map(item => ({
                status: item.status,
                count: item._count,
            })),
        };
    }
    static async getRevenueAnalytics(query) {
        const { period, groupBy } = query;
        const now = new Date();
        let startDate;
        switch (period) {
            case '24h':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        let dateFormat;
        switch (groupBy) {
            case 'hour':
                dateFormat = 'YYYY-MM-DD HH24:00:00';
                break;
            case 'day':
                dateFormat = 'YYYY-MM-DD';
                break;
            case 'week':
                dateFormat = 'YYYY-"W"WW';
                break;
            case 'month':
                dateFormat = 'YYYY-MM';
                break;
            default:
                dateFormat = 'YYYY-MM-DD';
        }
        const revenueData = await database_1.default.$queryRaw `
      SELECT 
        TO_CHAR(completed_at, ${dateFormat}) as period,
        SUM(amount)::numeric as revenue,
        COUNT(*)::integer as transactions
      FROM payment_events 
      WHERE completed_at >= ${startDate} AND status = 'success'
      GROUP BY TO_CHAR(completed_at, ${dateFormat})
      ORDER BY period ASC
    `;
        const revenueByPurpose = await database_1.default.paymentEvent.groupBy({
            by: ['paymentPurpose'],
            where: {
                completedAt: { gte: startDate },
                status: client_1.PaymentStatus.success,
            },
            _sum: { amount: true },
            _count: true,
        });
        return {
            revenue: revenueData,
            byPurpose: revenueByPurpose.map(item => ({
                purpose: item.paymentPurpose,
                revenue: Number(item._sum.amount) || 0,
                transactions: item._count,
            })),
        };
    }
    static async getUserAnalytics(query) {
        const { period, groupBy } = query;
        const now = new Date();
        let startDate;
        switch (period) {
            case '24h':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        let dateFormat;
        switch (groupBy) {
            case 'hour':
                dateFormat = 'YYYY-MM-DD HH24:00:00';
                break;
            case 'day':
                dateFormat = 'YYYY-MM-DD';
                break;
            case 'week':
                dateFormat = 'YYYY-"W"WW';
                break;
            case 'month':
                dateFormat = 'YYYY-MM';
                break;
            default:
                dateFormat = 'YYYY-MM-DD';
        }
        const userRegistrations = await database_1.default.$queryRaw `
      SELECT 
        TO_CHAR(created_at, ${dateFormat}) as period,
        COUNT(*)::integer as count
      FROM users 
      WHERE created_at >= ${startDate}
      GROUP BY TO_CHAR(created_at, ${dateFormat})
      ORDER BY period ASC
    `;
        const usersByRole = await database_1.default.user.groupBy({
            by: ['role'],
            where: { createdAt: { gte: startDate } },
            _count: true,
        });
        return {
            registrations: userRegistrations,
            byRole: usersByRole.map(item => ({
                role: item.role,
                count: item._count,
            })),
        };
    }
    static async createQRCodePool(poolName, totalCapacity) {
        const pool = await database_1.default.qRCodePool.create({
            data: {
                poolName,
                totalCapacity,
                usedCount: 0,
                status: 'active',
            },
        });
        return pool;
    }
    static async generateQRCodes(poolId, quantity) {
        const pool = await database_1.default.qRCodePool.findUnique({
            where: { id: poolId },
        });
        if (!pool) {
            throw new types_1.AppError('QR code pool not found', 404);
        }
        if (pool.status !== 'active') {
            throw new types_1.AppError('QR code pool is not active', 400);
        }
        if (pool.usedCount + quantity > pool.totalCapacity) {
            throw new types_1.AppError('Insufficient capacity in QR code pool', 400);
        }
        const result = await qr_service_1.QRService.generateQRCodes(poolId, quantity);
        return result;
    }
    static async getQRCodePools(page = 1, limit = 25) {
        const offset = (page - 1) * limit;
        const [pools, total] = await Promise.all([
            database_1.default.qRCodePool.findMany({
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit,
            }),
            database_1.default.qRCodePool.count(),
        ]);
        const meta = {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        };
        return { pools, meta };
    }
    static async getAllUsers(page = 1, limit = 25, filters = {}) {
        const offset = (page - 1) * limit;
        const where = {};
        if (filters.role)
            where.role = filters.role;
        if (filters.status === 'active')
            where.isActive = true;
        if (filters.status === 'inactive')
            where.isActive = false;
        const [users, total] = await Promise.all([
            database_1.default.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    emailVerified: true,
                    phoneVerified: true,
                    lastLogin: true,
                    createdAt: true,
                    petOwner: {
                        select: {
                            id: true,
                            city: true,
                            state: true,
                        },
                    },
                    executive: {
                        select: {
                            id: true,
                            employeeId: true,
                            territory: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit,
            }),
            database_1.default.user.count({ where }),
        ]);
        const meta = {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        };
        return { users, meta };
    }
    static async suspendUser(userId, reason, notifyUser = true) {
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new types_1.AppError('User not found', 404);
        }
        if (!user.isActive) {
            throw new types_1.AppError('User is already suspended', 400);
        }
        const updatedUser = await database_1.default.user.update({
            where: { id: userId },
            data: { isActive: false },
        });
        await database_1.default.userSession.deleteMany({
            where: { userId },
        });
        if (notifyUser) {
            console.log(`User ${user.email} suspended: ${reason}`);
        }
        return { user: updatedUser, message: 'User suspended successfully' };
    }
    static async reactivateUser(userId) {
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new types_1.AppError('User not found', 404);
        }
        if (user.isActive) {
            throw new types_1.AppError('User is already active', 400);
        }
        const updatedUser = await database_1.default.user.update({
            where: { id: userId },
            data: { isActive: true },
        });
        return { user: updatedUser, message: 'User reactivated successfully' };
    }
    static async getSystemStats() {
        const [totalUsers, activeUsers, totalPets, activePets, totalQRCodes, assignedQRCodes, totalScans, successfulScans, totalRevenue, openTickets,] = await Promise.all([
            database_1.default.user.count(),
            database_1.default.user.count({ where: { isActive: true } }),
            database_1.default.pet.count(),
            database_1.default.pet.count({ where: { status: client_1.PetStatus.active } }),
            database_1.default.qRCode.count(),
            database_1.default.qRCode.count({ where: { status: { in: [client_1.QRStatus.assigned, client_1.QRStatus.active] } } }),
            database_1.default.qRScanEvent.count(),
            database_1.default.qRScanEvent.count({ where: { scanResult: 'success' } }),
            database_1.default.paymentEvent.aggregate({
                where: { status: client_1.PaymentStatus.success },
                _sum: { amount: true },
            }),
            database_1.default.supportTicket.count({ where: { status: 'open' } }),
        ]);
        return {
            users: { total: totalUsers, active: activeUsers },
            pets: { total: totalPets, active: activePets },
            qrCodes: { total: totalQRCodes, assigned: assignedQRCodes },
            scans: { total: totalScans, successful: successfulScans },
            revenue: { total: Number(totalRevenue._sum.amount) || 0 },
            support: { openTickets },
        };
    }
}
exports.AdminService = AdminService;
//# sourceMappingURL=admin.service.js.map