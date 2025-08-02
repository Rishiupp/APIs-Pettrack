"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoleBasedRateLimit = exports.paymentRateLimit = exports.qrScanRateLimit = exports.otpRateLimit = exports.strictRateLimit = exports.defaultRateLimit = void 0;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
const config_1 = require("../../config");
const response_1 = require("../../utils/response");
exports.defaultRateLimit = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        response_1.ResponseHandler.tooManyRequests(res, 'Rate limit exceeded');
    },
});
exports.strictRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        response_1.ResponseHandler.tooManyRequests(res, 'Too many attempts, please wait 15 minutes');
    },
});
exports.otpRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many OTP requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const phone = req.body?.phone;
        if (phone) {
            return `otp_${phone}`;
        }
        return `otp_${(0, express_rate_limit_1.ipKeyGenerator)(req.ip || '127.0.0.1')}`;
    },
    handler: (req, res) => {
        response_1.ResponseHandler.tooManyRequests(res, 'Too many OTP requests, please wait 1 hour');
    },
});
exports.qrScanRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many QR code scans, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        response_1.ResponseHandler.tooManyRequests(res, 'QR scan rate limit exceeded');
    },
});
exports.paymentRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: 'Too many payment attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        response_1.ResponseHandler.tooManyRequests(res, 'Payment rate limit exceeded');
    },
});
const createRoleBasedRateLimit = (limits) => {
    return (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        max: (req) => {
            const user = req.user;
            if (!user)
                return 10;
            const roleLimit = limits[user.role];
            return roleLimit ? roleLimit.max : 100;
        },
        keyGenerator: (req) => {
            const user = req.user;
            return user ? `user_${user.id}` : `ip_${(0, express_rate_limit_1.ipKeyGenerator)(req.ip || '127.0.0.1')}`;
        },
        handler: (req, res) => {
            response_1.ResponseHandler.tooManyRequests(res, 'Rate limit exceeded for your account type');
        },
    });
};
exports.createRoleBasedRateLimit = createRoleBasedRateLimit;
//# sourceMappingURL=index.js.map