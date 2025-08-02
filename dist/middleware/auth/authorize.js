"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuthenticated = exports.requirePetOwner = exports.requireExecutive = exports.requireAdmin = exports.authorize = void 0;
const client_1 = require("@prisma/client");
const response_1 = require("../../utils/response");
const authorize = (allowedRoles, requiredPermissions) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                response_1.ResponseHandler.unauthorized(res, 'Authentication required');
                return;
            }
            if (!allowedRoles.includes(req.user.role)) {
                response_1.ResponseHandler.forbidden(res, 'Insufficient permissions');
                return;
            }
            if (requiredPermissions && requiredPermissions.length > 0) {
                const hasAllPermissions = requiredPermissions.every(permission => req.user.permissions.includes(permission));
                if (!hasAllPermissions) {
                    response_1.ResponseHandler.forbidden(res, 'Missing required permissions');
                    return;
                }
            }
            next();
        }
        catch (error) {
            response_1.ResponseHandler.internalError(res, 'Authorization check failed');
        }
    };
};
exports.authorize = authorize;
exports.requireAdmin = (0, exports.authorize)([client_1.UserRole.admin]);
exports.requireExecutive = (0, exports.authorize)([client_1.UserRole.executive, client_1.UserRole.admin]);
exports.requirePetOwner = (0, exports.authorize)([
    client_1.UserRole.pet_owner,
    client_1.UserRole.executive,
    client_1.UserRole.admin,
]);
exports.requireAuthenticated = (0, exports.authorize)([
    client_1.UserRole.pet_owner,
    client_1.UserRole.executive,
    client_1.UserRole.admin,
]);
//# sourceMappingURL=authorize.js.map