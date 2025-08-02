"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const error_handling_1 = require("./middleware/error-handling");
const upload_1 = require("./middleware/upload");
const rate_limiting_1 = require("./middleware/rate-limiting");
const auth_1 = __importDefault(require("./routes/auth"));
const pets_1 = __importDefault(require("./routes/pets"));
const qr_1 = __importDefault(require("./routes/qr"));
const payments_1 = __importDefault(require("./routes/payments"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const support_1 = __importDefault(require("./routes/support"));
const admin_1 = __importDefault(require("./routes/admin"));
const executive_1 = __importDefault(require("./routes/executive"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.config.security.corsOrigin,
    credentials: true,
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(rate_limiting_1.defaultRateLimit);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express_1.default.static('uploads'));
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: config_1.config.app.version,
    });
});
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/pets', pets_1.default);
app.use('/api/v1/qr', qr_1.default);
app.use('/api/v1/payments', payments_1.default);
app.use('/api/v1/notifications', notifications_1.default);
app.use('/api/v1/support', support_1.default);
app.use('/api/v1/admin', admin_1.default);
app.use('/api/v1/executive', executive_1.default);
app.use(error_handling_1.notFoundHandler);
app.use(upload_1.handleUploadError);
app.use(error_handling_1.errorHandler);
const server = app.listen(config_1.config.app.port, () => {
    logger_1.logger.info(`🚀 Pet Track API server running on port ${config_1.config.app.port}`);
    logger_1.logger.info(`📱 Environment: ${config_1.config.app.env}`);
    logger_1.logger.info(`🔗 Health check: http://localhost:${config_1.config.app.port}/health`);
});
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger_1.logger.info('Process terminated');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger_1.logger.info('Process terminated');
        process.exit(0);
    });
});
exports.default = app;
//# sourceMappingURL=index.js.map