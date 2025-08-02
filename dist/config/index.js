"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    app: {
        name: process.env.APP_NAME || 'Pet Track',
        version: process.env.APP_VERSION || '1.0.0',
        port: parseInt(process.env.PORT || '3000'),
        env: process.env.NODE_ENV || 'development',
    },
    database: {
        url: process.env.DATABASE_URL,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRE_TIME || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE_TIME || '7d',
    },
    otp: {
        expiryTime: parseInt(process.env.OTP_EXPIRE_TIME || '300'),
        maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3'),
    },
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    },
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    },
    email: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    sms: {
        apiKey: process.env.SMS_API_KEY,
        senderId: process.env.SMS_SENDER_ID || 'PETTRCK',
    },
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'),
        allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(','),
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    qr: {
        baseUrl: process.env.QR_CODE_BASE_URL || 'https://your-domain.com/scan',
        size: parseInt(process.env.QR_CODE_SIZE || '300'),
        errorCorrection: process.env.QR_CODE_ERROR_CORRECTION || 'M',
    },
    security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    },
    googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        filePath: process.env.LOG_FILE_PATH || 'logs/app.log',
    },
};
const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'SMTP_USER',
    'SMTP_PASS',
];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
    }
}
//# sourceMappingURL=index.js.map