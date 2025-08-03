"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_1 = require("../../utils/jwt");
const response_1 = require("../../utils/response");
const database_1 = __importDefault(require("../../config/database"));
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            response_1.ResponseHandler.unauthorized(res, 'Access token required');
            return;
        }
        const token = authHeader.substring(7);
        if (jwt_1.JWTUtil.isTokenExpired(token)) {
            response_1.ResponseHandler.unauthorized(res, 'Token has expired');
            return;
        }
        const payload = jwt_1.JWTUtil.verifyAccessToken(token);
        if (!payload) {
            response_1.ResponseHandler.unauthorized(res, 'Invalid or expired token');
            return;
        }
        const user = await database_1.default.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                role: true,
                isActive: true,
            },
        });
        if (!user || !user.isActive) {
            response_1.ResponseHandler.unauthorized(res, 'User account not found or inactive');
            return;
        }
        req.user = {
            id: user.id,
            role: user.role,
            permissions: payload.permissions,
        };
        next();
    }
    catch (error) {
        console.error('Authentication middleware error:', error);
        response_1.ResponseHandler.unauthorized(res, 'Authentication failed');
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=authenticate.js.map