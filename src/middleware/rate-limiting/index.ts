import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { config } from '../../config';
import { ResponseHandler } from '../../utils/response';

// Default rate limiting
export const defaultRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ResponseHandler.tooManyRequests(res, 'Rate limit exceeded');
  },
});

// Strict rate limiting for sensitive operations
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ResponseHandler.tooManyRequests(res, 'Too many attempts, please wait 15 minutes');
  },
});

// OTP rate limiting
export const otpRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 OTP requests per hour
  message: 'Too many OTP requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use identifier (phone/email) as key if available, otherwise fall back to IP
    const identifier = req.body?.identifier || req.body?.phone;
    if (identifier) {
      return `otp_${identifier}`;
    }
    return `otp_${ipKeyGenerator(req.ip || '127.0.0.1')}`;
  },
  handler: (req, res) => {
    ResponseHandler.tooManyRequests(res, 'Too many OTP requests, please wait 1 hour');
  },
});

// QR scan rate limiting
export const qrScanRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 scans per minute
  message: 'Too many QR code scans, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ResponseHandler.tooManyRequests(res, 'QR scan rate limit exceeded');
  },
});

// Payment rate limiting
export const paymentRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // limit each IP to 5 payment attempts per 10 minutes
  message: 'Too many payment attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ResponseHandler.tooManyRequests(res, 'Payment rate limit exceeded');
  },
});

// Role-based rate limiting
export const createRoleBasedRateLimit = (limits: {
  [key: string]: { windowMs: number; max: number };
}) => {
  return rateLimit({
    windowMs: 60 * 1000, // Default 1 minute
    max: (req) => {
      const user = (req as any).user;
      if (!user) return 10; // Anonymous users
      
      const roleLimit = limits[user.role];
      return roleLimit ? roleLimit.max : 100;
    },
    keyGenerator: (req) => {
      const user = (req as any).user;
      return user ? `user_${user.id}` : `ip_${ipKeyGenerator(req.ip || '127.0.0.1')}`;
    },
    handler: (req, res) => {
      ResponseHandler.tooManyRequests(res, 'Rate limit exceeded for your account type');
    },
  });
};