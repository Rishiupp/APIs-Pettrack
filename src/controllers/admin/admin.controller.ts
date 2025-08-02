import { Request, Response } from 'express';
import { AdminService } from '../../services/admin/admin.service';
import { ResponseHandler } from '../../utils/response';
import { ValidationUtil } from '../../utils/validation';
import { AuthRequest } from '../../types';
import { asyncHandler } from '../../middleware/error-handling';

export class AdminController {
  static getDashboardOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const overview = await AdminService.getDashboardOverview();
    return ResponseHandler.success(res, overview);
  });

  static getPetAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period = '30d', groupBy = 'day' } = req.query;

    // Validate parameters
    const validPeriods = ['24h', '7d', '30d', '90d', '1y'];
    const validGroupBy = ['hour', 'day', 'week', 'month'];

    const errors: Array<{field: string; message: string; value?: any}> = [];
    if (!validPeriods.includes(period as string)) {
      errors.push({
        field: 'period',
        message: 'Invalid period. Must be one of: 24h, 7d, 30d, 90d, 1y',
        value: period,
      });
    }

    if (!validGroupBy.includes(groupBy as string)) {
      errors.push({
        field: 'groupBy',
        message: 'Invalid groupBy. Must be one of: hour, day, week, month',
        value: groupBy,
      });
    }

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const analytics = await AdminService.getPetAnalytics({
      period: period as any,
      groupBy: groupBy as any,
      metric: 'registrations',
    });

    return ResponseHandler.success(res, analytics);
  });

  static getQRAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period = '30d', groupBy = 'day' } = req.query;

    const validPeriods = ['24h', '7d', '30d', '90d', '1y'];
    const validGroupBy = ['hour', 'day', 'week', 'month'];

    const errors: Array<{field: string; message: string; value?: any}> = [];
    if (!validPeriods.includes(period as string)) {
      errors.push({
        field: 'period',
        message: 'Invalid period',
        value: period,
      });
    }

    if (!validGroupBy.includes(groupBy as string)) {
      errors.push({
        field: 'groupBy',
        message: 'Invalid groupBy',
        value: groupBy,
      });
    }

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const analytics = await AdminService.getQRAnalytics({
      period: period as any,
      groupBy: groupBy as any,
      metric: 'scans',
    });

    return ResponseHandler.success(res, analytics);
  });

  static getRevenueAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period = '30d', groupBy = 'day' } = req.query;

    const validPeriods = ['24h', '7d', '30d', '90d', '1y'];
    const validGroupBy = ['hour', 'day', 'week', 'month'];

    const errors: Array<{field: string; message: string; value?: any}> = [];
    if (!validPeriods.includes(period as string)) {
      errors.push({
        field: 'period',
        message: 'Invalid period',
        value: period,
      });
    }

    if (!validGroupBy.includes(groupBy as string)) {
      errors.push({
        field: 'groupBy',
        message: 'Invalid groupBy',
        value: groupBy,
      });
    }

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const analytics = await AdminService.getRevenueAnalytics({
      period: period as any,
      groupBy: groupBy as any,
      metric: 'revenue',
    });

    return ResponseHandler.success(res, analytics);
  });

  static getUserAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period = '30d', groupBy = 'day' } = req.query;

    const validPeriods = ['24h', '7d', '30d', '90d', '1y'];
    const validGroupBy = ['hour', 'day', 'week', 'month'];

    const errors: Array<{field: string; message: string; value?: any}> = [];
    if (!validPeriods.includes(period as string)) {
      errors.push({
        field: 'period',
        message: 'Invalid period',
        value: period,
      });
    }

    if (!validGroupBy.includes(groupBy as string)) {
      errors.push({
        field: 'groupBy',
        message: 'Invalid groupBy',
        value: groupBy,
      });
    }

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const analytics = await AdminService.getUserAnalytics({
      period: period as any,
      groupBy: groupBy as any,
      metric: 'users',
    });

    return ResponseHandler.success(res, analytics);
  });

  static createQRCodePool = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { poolName, totalCapacity } = req.body;

    const errors = ValidationUtil.validateRequired({ poolName, totalCapacity });

    if (typeof totalCapacity !== 'number' || totalCapacity <= 0) {
      errors.push({
        field: 'totalCapacity',
        message: 'Total capacity must be a positive number',
        value: totalCapacity,
      });
    }

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const pool = await AdminService.createQRCodePool(
      ValidationUtil.sanitizeString(poolName),
      totalCapacity
    );

    return ResponseHandler.created(res, pool, 'QR code pool created successfully');
  });

  static generateQRCodes = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { poolId, quantity } = req.body;

    const errors = ValidationUtil.validateRequired({ poolId, quantity });

    if (typeof quantity !== 'number' || quantity <= 0 || quantity > 10000) {
      errors.push({
        field: 'quantity',
        message: 'Quantity must be between 1 and 10000',
        value: quantity,
      });
    }

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const result = await AdminService.generateQRCodes(poolId, quantity);
    return ResponseHandler.success(res, result, 'QR codes generated successfully');
  });

  static getQRCodePools = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = req.query;

    const { page: validPage, limit: validLimit, errors } = ValidationUtil.validatePagination(
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const result = await AdminService.getQRCodePools(validPage, validLimit);
    return ResponseHandler.success(res, result.pools, undefined, 200, result.meta);
  });

  static getAllUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, role, status } = req.query;

    const { page: validPage, limit: validLimit, errors } = ValidationUtil.validatePagination(
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    // Validate role filter
    if (role) {
      const validRoles = ['pet_owner', 'executive', 'admin'];
      if (!validRoles.includes(role as string)) {
        errors.push({
          field: 'role',
          message: 'Invalid role',
          value: role,
        });
      }
    }

    // Validate status filter
    if (status) {
      const validStatuses = ['active', 'inactive'];
      if (!validStatuses.includes(status as string)) {
        errors.push({
          field: 'status',
          message: 'Invalid status',
          value: status,
        });
      }
    }

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const filters: any = {};
    if (role) filters.role = role;
    if (status) filters.status = status;

    const result = await AdminService.getAllUsers(validPage, validLimit, filters);
    return ResponseHandler.success(res, result.users, undefined, 200, result.meta);
  });

  static suspendUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { reason, notifyUser = true } = req.body;

    if (!userId) {
      return ResponseHandler.error(res, 'User ID is required', 400);
    }

    const errors = ValidationUtil.validateRequired({ reason });

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const result = await AdminService.suspendUser(
      userId,
      ValidationUtil.sanitizeString(reason),
      notifyUser
    );

    return ResponseHandler.success(res, result, 'User suspended successfully');
  });

  static reactivateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
      return ResponseHandler.error(res, 'User ID is required', 400);
    }

    const result = await AdminService.reactivateUser(userId);
    return ResponseHandler.success(res, result, 'User reactivated successfully');
  });

  static getSystemStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stats = await AdminService.getSystemStats();
    return ResponseHandler.success(res, stats);
  });
}