"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRolePermissions = exports.JWTUtil = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const client_1 = require("@prisma/client");
class JWTUtil {
    static generateAccessToken(userId, role, permissions) {
        const payload = {
            sub: userId,
            role,
            permissions,
        };
        const options = {
            expiresIn: config_1.config.jwt.expiresIn,
            issuer: config_1.config.app.name,
            audience: config_1.config.app.name,
        };
        return jsonwebtoken_1.default.sign(payload, config_1.config.jwt.secret, options);
    }
    static generateRefreshToken(userId) {
        const options = {
            expiresIn: config_1.config.jwt.refreshExpiresIn,
            issuer: config_1.config.app.name,
            audience: config_1.config.app.name,
        };
        return jsonwebtoken_1.default.sign({ sub: userId, type: 'refresh' }, config_1.config.jwt.secret, options);
    }
    static verifyAccessToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret, {
                issuer: config_1.config.app.name,
                audience: config_1.config.app.name,
            });
            if (decoded.type === 'refresh') {
                console.error('Refresh token used as access token');
                return null;
            }
            return decoded;
        }
        catch (error) {
            console.error('JWT verification failed:', error instanceof Error ? error.message : String(error));
            return null;
        }
    }
    static verifyRefreshToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret, {
                issuer: config_1.config.app.name,
                audience: config_1.config.app.name,
            });
            if (decoded.type !== 'refresh') {
                console.error('Non-refresh token used as refresh token');
                return null;
            }
            return decoded;
        }
        catch (error) {
            console.error('Refresh token verification failed:', error instanceof Error ? error.message : String(error));
            return null;
        }
    }
    static decodeToken(token) {
        try {
            return jsonwebtoken_1.default.decode(token);
        }
        catch (error) {
            return null;
        }
    }
    static isTokenExpired(token) {
        const decoded = this.decodeToken(token);
        if (!decoded)
            return true;
        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
    }
    static getTokenExpiryTime(token) {
        const decoded = this.decodeToken(token);
        if (!decoded)
            return null;
        return new Date(decoded.exp * 1000);
    }
}
exports.JWTUtil = JWTUtil;
const getRolePermissions = (role) => {
    switch (role) {
        case client_1.UserRole.admin:
            return [
                'users:read',
                'users:write',
                'users:delete',
                'pets:read',
                'pets:write',
                'pets:delete',
                'qr:read',
                'qr:write',
                'qr:generate',
                'payments:read',
                'payments:write',
                'analytics:read',
                'support:read',
                'support:write',
                'support:assign',
                'notifications:send',
                'system:manage',
            ];
        case client_1.UserRole.executive:
            return [
                'pets:read',
                'pets:write',
                'pets:register',
                'qr:read',
                'qr:assign',
                'payments:read',
                'payments:write',
                'registrations:read',
                'support:read',
                'support:write',
            ];
        case client_1.UserRole.pet_owner:
            return [
                'pets:read',
                'pets:write',
                'pets:own',
                'qr:read',
                'qr:scan',
                'payments:read',
                'payments:write',
                'notifications:read',
                'support:read',
                'support:write',
                'profile:read',
                'profile:write',
            ];
        default:
            return [];
    }
};
exports.getRolePermissions = getRolePermissions;
//# sourceMappingURL=jwt.js.map