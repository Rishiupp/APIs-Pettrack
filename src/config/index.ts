import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Application
  app: {
    name: process.env.APP_NAME || 'Pet Track',
    version: process.env.APP_VERSION || '1.0.0',
    port: parseInt(process.env.PORT || '3000'),
    env: process.env.NODE_ENV || 'development',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL!,
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRE_TIME || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE_TIME || '7d',
  },

  // OTP Configuration
  otp: {
    expiryTime: parseInt(process.env.OTP_EXPIRE_TIME || '300'), // 5 minutes
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3'),
  },

  // Razorpay Configuration
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID!,
    keySecret: process.env.RAZORPAY_KEY_SECRET!,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET!,
  },

  // Firebase Configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  },

  // Email Configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },

  // SMS Configuration (Twilio)
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID, // Twilio Account SID
    apiKey: process.env.SMS_API_KEY, // Twilio API Key
    apiSecret: process.env.SMS_API_SECRET, // Twilio API Secret
    senderId: process.env.SMS_SENDER_ID || 'PETTRCK', // Sender ID or Phone Number
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
    allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(','),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // QR Code Configuration
  qr: {
    baseUrl: process.env.QR_CODE_BASE_URL || 'https://your-domain.com/scan',
    size: parseInt(process.env.QR_CODE_SIZE || '300'),
    errorCorrection: process.env.QR_CODE_ERROR_CORRECTION || 'M',
  },

  // OAuth Configuration
  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    appleClientId: process.env.APPLE_CLIENT_ID || '',
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    corsOrigin: process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',') : 
      ['http://localhost:3000', 'http://localhost:5000', 'https://*.replit.dev', 'https://*.replit.app'],
  },

  // Geolocation
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || 'logs/app.log',
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'SMTP_USER',
  'SMTP_PASS',
  'TWILIO_ACCOUNT_SID', // Twilio Account SID
  'SMS_API_KEY', // Twilio API Key
  'SMS_API_SECRET', // Twilio API Secret
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
}