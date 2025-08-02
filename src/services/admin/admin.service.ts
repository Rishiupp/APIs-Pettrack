import { PetStatus, PaymentStatus, UserRole, QRStatus } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../types';
import { DashboardOverview, AnalyticsQuery } from '../../types';
import { QRService } from '../qr/qr.service';

export class AdminService {
  static async getDashboardOverview(): Promise<DashboardOverview> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalPets,
      activePets,
      totalUsers,
      qrCodesAssigned,
      scansToday,
      revenueThisMonth,
    ] = await Promise.all([
      prisma.pet.count(),
      prisma.pet.count({ where: { status: PetStatus.active } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.qRCode.count({ where: { status: { in: [QRStatus.assigned, QRStatus.active] } } }),
      prisma.qRScanEvent.count({
        where: {
          scanTimestamp: { gte: startOfToday },
          scanResult: 'success',
        },
      }),
      prisma.paymentEvent.aggregate({
        where: {
          status: PaymentStatus.success,
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

  static async getPetAnalytics(query: AnalyticsQuery) {
    const { period, groupBy } = query;
    const now = new Date();
    let startDate: Date;

    // Calculate start date based on period
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

    // Build PostgreSQL date grouping based on groupBy
    let dateFormat: string;
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

    const petRegistrations = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(created_at, ${dateFormat}) as period,
        COUNT(*)::integer as count
      FROM pets 
      WHERE created_at >= ${startDate}
      GROUP BY TO_CHAR(created_at, ${dateFormat})
      ORDER BY period ASC
    `;

    const petsBySpecies = await prisma.pet.groupBy({
      by: ['speciesId'],
      where: { createdAt: { gte: startDate } },
      _count: true,
    });

    const speciesData = await Promise.all(
      petsBySpecies.map(async (item) => {
        const species = await prisma.petSpecies.findUnique({
          where: { id: item.speciesId! },
          select: { speciesName: true },
        });
        return {
          species: species?.speciesName || 'Unknown',
          count: item._count,
        };
      })
    );

    return {
      registrations: petRegistrations,
      bySpecies: speciesData,
    };
  }

  static async getQRAnalytics(query: AnalyticsQuery) {
    const { period, groupBy } = query;
    const now = new Date();
    let startDate: Date;

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

    let dateFormat: string;
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

    const scanEvents = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(scan_timestamp, ${dateFormat}) as period,
        COUNT(*)::integer as count,
        COUNT(CASE WHEN scan_result = 'success' THEN 1 END)::integer as successful_scans
      FROM qr_scan_events 
      WHERE scan_timestamp >= ${startDate}
      GROUP BY TO_CHAR(scan_timestamp, ${dateFormat})
      ORDER BY period ASC
    `;

    const qrStatusBreakdown = await prisma.qRCode.groupBy({
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

  static async getRevenueAnalytics(query: AnalyticsQuery) {
    const { period, groupBy } = query;
    const now = new Date();
    let startDate: Date;

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

    let dateFormat: string;
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

    const revenueData = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(completed_at, ${dateFormat}) as period,
        SUM(amount)::numeric as revenue,
        COUNT(*)::integer as transactions
      FROM payment_events 
      WHERE completed_at >= ${startDate} AND status = 'success'
      GROUP BY TO_CHAR(completed_at, ${dateFormat})
      ORDER BY period ASC
    `;

    const revenueByPurpose = await prisma.paymentEvent.groupBy({
      by: ['paymentPurpose'],
      where: {
        completedAt: { gte: startDate },
        status: PaymentStatus.success,
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

  static async getUserAnalytics(query: AnalyticsQuery) {
    const { period, groupBy } = query;
    const now = new Date();
    let startDate: Date;

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

    let dateFormat: string;
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

    const userRegistrations = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(created_at, ${dateFormat}) as period,
        COUNT(*)::integer as count
      FROM users 
      WHERE created_at >= ${startDate}
      GROUP BY TO_CHAR(created_at, ${dateFormat})
      ORDER BY period ASC
    `;

    const usersByRole = await prisma.user.groupBy({
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

  static async createQRCodePool(poolName: string, totalCapacity: number) {
    const pool = await prisma.qRCodePool.create({
      data: {
        poolName,
        totalCapacity,
        usedCount: 0,
        status: 'active',
      },
    });

    return pool;
  }

  static async generateQRCodes(poolId: string, quantity: number) {
    const pool = await prisma.qRCodePool.findUnique({
      where: { id: poolId },
    });

    if (!pool) {
      throw new AppError('QR code pool not found', 404);
    }

    if (pool.status !== 'active') {
      throw new AppError('QR code pool is not active', 400);
    }

    if (pool.usedCount + quantity > pool.totalCapacity) {
      throw new AppError('Insufficient capacity in QR code pool', 400);
    }

    const result = await QRService.generateQRCodes(poolId, quantity);
    return result;
  }

  static async getQRCodePools(page: number = 1, limit: number = 25) {
    const offset = (page - 1) * limit;

    const [pools, total] = await Promise.all([
      prisma.qRCodePool.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.qRCodePool.count(),
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

  static async getAllUsers(
    page: number = 1,
    limit: number = 25,
    filters: {
      role?: UserRole;
      status?: 'active' | 'inactive';
    } = {}
  ) {
    const offset = (page - 1) * limit;
    const where: any = {};

    if (filters.role) where.role = filters.role;
    if (filters.status === 'active') where.isActive = true;
    if (filters.status === 'inactive') where.isActive = false;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
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
      prisma.user.count({ where }),
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

  static async suspendUser(userId: string, reason: string, notifyUser: boolean = true) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.isActive) {
      throw new AppError('User is already suspended', 400);
    }

    // Suspend user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Deactivate all user sessions
    await prisma.userSession.deleteMany({
      where: { userId },
    });

    // TODO: Send notification to user about suspension
    if (notifyUser) {
      console.log(`User ${user.email} suspended: ${reason}`);
    }

    return { user: updatedUser, message: 'User suspended successfully' };
  }

  static async reactivateUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isActive) {
      throw new AppError('User is already active', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    return { user: updatedUser, message: 'User reactivated successfully' };
  }

  static async getSystemStats() {
    const [
      totalUsers,
      activeUsers,
      totalPets,
      activePets,
      totalQRCodes,
      assignedQRCodes,
      totalScans,
      successfulScans,
      totalRevenue,
      openTickets,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.pet.count(),
      prisma.pet.count({ where: { status: PetStatus.active } }),
      prisma.qRCode.count(),
      prisma.qRCode.count({ where: { status: { in: [QRStatus.assigned, QRStatus.active] } } }),
      prisma.qRScanEvent.count(),
      prisma.qRScanEvent.count({ where: { scanResult: 'success' } }),
      prisma.paymentEvent.aggregate({
        where: { status: PaymentStatus.success },
        _sum: { amount: true },
      }),
      prisma.supportTicket.count({ where: { status: 'open' } }),
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