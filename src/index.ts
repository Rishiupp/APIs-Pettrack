import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handling';
import { handleUploadError } from './middleware/upload';
import { defaultRateLimit } from './middleware/rate-limiting';
import { rawBodyMiddleware } from './middleware/raw-body';

// Import routes
import authRoutes from './routes/auth';
import petRoutes from './routes/pets';
import petRegistrationRoutes from './routes/pet-registration';
import qrRoutes from './routes/qr';
import paymentRoutes from './routes/payments';
import newPaymentRoutes from './routes/payments/new-payments';
import notificationRoutes from './routes/notifications';
import supportRoutes from './routes/support';
import adminRoutes from './routes/admin';
import executiveRoutes from './routes/executive';

const app = express();

// Trust proxy for proper IP detection
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors());

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Rate limiting
app.use(defaultRateLimit);

// Body parsing middleware with raw body support for webhooks
app.use(rawBodyMiddleware);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: config.app.version,
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/pets', petRoutes);
app.use('/api/v1/pet-registration', petRegistrationRoutes);
app.use('/api/v1/qr', qrRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v2/payments', newPaymentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/executive', executiveRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(handleUploadError);
app.use(errorHandler);

const server = app.listen(config.app.port, () => {
  logger.info(`🚀 Pet Track API server running on port ${config.app.port}`);
  logger.info(`📱 Environment: ${config.app.env}`);
  logger.info(`🔗 Health check: http://localhost:${config.app.port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app;