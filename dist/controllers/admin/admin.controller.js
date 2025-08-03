"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_service_1 = require("../../services/admin/admin.service");
const response_1 = require("../../utils/response");
const validation_1 = require("../../utils/validation");
const error_handling_1 = require("../../middleware/error-handling");
class AdminController {
}
exports.AdminController = AdminController;
_a = AdminController;
AdminController.getDashboardOverview = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const overview = await admin_service_1.AdminService.getDashboardOverview();
    return response_1.ResponseHandler.success(res, overview);
});
AdminController.getPetAnalytics = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { period = '30d', groupBy = 'day' } = req.query;
    const validPeriods = ['24h', '7d', '30d', '90d', '1y'];
    const validGroupBy = ['hour', 'day', 'week', 'month'];
    const errors = [];
    if (!validPeriods.includes(period)) {
        errors.push({
            field: 'period',
            message: 'Invalid period. Must be one of: 24h, 7d, 30d, 90d, 1y',
            value: period,
        });
    }
    if (!validGroupBy.includes(groupBy)) {
        errors.push({
            field: 'groupBy',
            message: 'Invalid groupBy. Must be one of: hour, day, week, month',
            value: groupBy,
        });
    }
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const analytics = await admin_service_1.AdminService.getPetAnalytics({
        period: period,
        groupBy: groupBy,
        metric: 'registrations',
    });
    return response_1.ResponseHandler.success(res, analytics);
});
AdminController.getQRAnalytics = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { period = '30d', groupBy = 'day' } = req.query;
    const validPeriods = ['24h', '7d', '30d', '90d', '1y'];
    const validGroupBy = ['hour', 'day', 'week', 'month'];
    const errors = [];
    if (!validPeriods.includes(period)) {
        errors.push({
            field: 'period',
            message: 'Invalid period',
            value: period,
        });
    }
    if (!validGroupBy.includes(groupBy)) {
        errors.push({
            field: 'groupBy',
            message: 'Invalid groupBy',
            value: groupBy,
        });
    }
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const analytics = await admin_service_1.AdminService.getQRAnalytics({
        period: period,
        groupBy: groupBy,
        metric: 'scans',
    });
    return response_1.ResponseHandler.success(res, analytics);
});
AdminController.getRevenueAnalytics = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { period = '30d', groupBy = 'day' } = req.query;
    const validPeriods = ['24h', '7d', '30d', '90d', '1y'];
    const validGroupBy = ['hour', 'day', 'week', 'month'];
    const errors = [];
    if (!validPeriods.includes(period)) {
        errors.push({
            field: 'period',
            message: 'Invalid period',
            value: period,
        });
    }
    if (!validGroupBy.includes(groupBy)) {
        errors.push({
            field: 'groupBy',
            message: 'Invalid groupBy',
            value: groupBy,
        });
    }
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const analytics = await admin_service_1.AdminService.getRevenueAnalytics({
        period: period,
        groupBy: groupBy,
        metric: 'revenue',
    });
    return response_1.ResponseHandler.success(res, analytics);
});
AdminController.getUserAnalytics = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { period = '30d', groupBy = 'day' } = req.query;
    const validPeriods = ['24h', '7d', '30d', '90d', '1y'];
    const validGroupBy = ['hour', 'day', 'week', 'month'];
    const errors = [];
    if (!validPeriods.includes(period)) {
        errors.push({
            field: 'period',
            message: 'Invalid period',
            value: period,
        });
    }
    if (!validGroupBy.includes(groupBy)) {
        errors.push({
            field: 'groupBy',
            message: 'Invalid groupBy',
            value: groupBy,
        });
    }
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const analytics = await admin_service_1.AdminService.getUserAnalytics({
        period: period,
        groupBy: groupBy,
        metric: 'users',
    });
    return response_1.ResponseHandler.success(res, analytics);
});
AdminController.createQRCodePool = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { poolName, totalCapacity } = req.body;
    const errors = validation_1.ValidationUtil.validateRequired({ poolName, totalCapacity });
    if (typeof totalCapacity !== 'number' || totalCapacity <= 0) {
        errors.push({
            field: 'totalCapacity',
            message: 'Total capacity must be a positive number',
            value: totalCapacity,
        });
    }
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const pool = await admin_service_1.AdminService.createQRCodePool(validation_1.ValidationUtil.sanitizeString(poolName), totalCapacity);
    return response_1.ResponseHandler.created(res, pool, 'QR code pool created successfully');
});
AdminController.generateQRCodes = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { poolId, quantity } = req.body;
    const errors = validation_1.ValidationUtil.validateRequired({ poolId, quantity });
    if (typeof quantity !== 'number' || quantity <= 0 || quantity > 10000) {
        errors.push({
            field: 'quantity',
            message: 'Quantity must be between 1 and 10000',
            value: quantity,
        });
    }
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const result = await admin_service_1.AdminService.generateQRCodes(poolId, quantity);
    return response_1.ResponseHandler.success(res, result, 'QR codes generated successfully');
});
AdminController.getQRCodePools = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { page, limit } = req.query;
    const { page: validPage, limit: validLimit, errors } = validation_1.ValidationUtil.validatePagination(page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const result = await admin_service_1.AdminService.getQRCodePools(validPage, validLimit);
    return response_1.ResponseHandler.success(res, result.pools, undefined, 200, result.meta);
});
AdminController.getAllUsers = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { page, limit, role, status } = req.query;
    const { page: validPage, limit: validLimit, errors } = validation_1.ValidationUtil.validatePagination(page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    if (role) {
        const validRoles = ['pet_owner', 'executive', 'admin'];
        if (!validRoles.includes(role)) {
            errors.push({
                field: 'role',
                message: 'Invalid role',
                value: role,
            });
        }
    }
    if (status) {
        const validStatuses = ['active', 'inactive'];
        if (!validStatuses.includes(status)) {
            errors.push({
                field: 'status',
                message: 'Invalid status',
                value: status,
            });
        }
    }
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const filters = {};
    if (role)
        filters.role = role;
    if (status)
        filters.status = status;
    const result = await admin_service_1.AdminService.getAllUsers(validPage, validLimit, filters);
    return response_1.ResponseHandler.success(res, result.users, undefined, 200, result.meta);
});
AdminController.suspendUser = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const { reason, notifyUser = true } = req.body;
    if (!userId) {
        return response_1.ResponseHandler.error(res, 'User ID is required', 400);
    }
    const errors = validation_1.ValidationUtil.validateRequired({ reason });
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const result = await admin_service_1.AdminService.suspendUser(userId, validation_1.ValidationUtil.sanitizeString(reason), notifyUser);
    return response_1.ResponseHandler.success(res, result, 'User suspended successfully');
});
AdminController.reactivateUser = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        return response_1.ResponseHandler.error(res, 'User ID is required', 400);
    }
    const result = await admin_service_1.AdminService.reactivateUser(userId);
    return response_1.ResponseHandler.success(res, result, 'User reactivated successfully');
});
AdminController.getSystemStats = (0, error_handling_1.asyncHandler)(async (_req, res) => {
    const stats = await admin_service_1.AdminService.getSystemStats();
    return response_1.ResponseHandler.success(res, stats);
});
//# sourceMappingURL=admin.controller.js.map