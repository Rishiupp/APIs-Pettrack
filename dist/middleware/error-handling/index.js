"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const types_1 = require("../../types");
const response_1 = require("../../utils/response");
const logger_1 = require("../../utils/logger");
const errorHandler = (err, req, res, next) => {
    logger_1.logger.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    if (err instanceof types_1.AppError) {
        response_1.ResponseHandler.error(res, err.message, err.statusCode);
        return;
    }
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err;
        switch (prismaError.code) {
            case 'P2002':
                response_1.ResponseHandler.conflict(res, 'A record with this information already exists');
                return;
            case 'P2025':
                response_1.ResponseHandler.notFound(res, 'Record not found');
                return;
            case 'P2003':
                response_1.ResponseHandler.error(res, 'Foreign key constraint failed', 400);
                return;
            default:
                response_1.ResponseHandler.internalError(res, 'Database operation failed');
                return;
        }
    }
    if (err.name === 'ValidationError') {
        response_1.ResponseHandler.error(res, err.message, 400);
        return;
    }
    if (err.name === 'JsonWebTokenError') {
        response_1.ResponseHandler.unauthorized(res, 'Invalid token');
        return;
    }
    if (err.name === 'TokenExpiredError') {
        response_1.ResponseHandler.unauthorized(res, 'Token expired');
        return;
    }
    if (err.name === 'MulterError') {
        const multerError = err;
        switch (multerError.code) {
            case 'LIMIT_FILE_SIZE':
                response_1.ResponseHandler.error(res, 'File too large', 413);
                return;
            case 'LIMIT_FILE_COUNT':
                response_1.ResponseHandler.error(res, 'Too many files', 400);
                return;
            case 'LIMIT_UNEXPECTED_FILE':
                response_1.ResponseHandler.error(res, 'Unexpected file field', 400);
                return;
            default:
                response_1.ResponseHandler.error(res, 'File upload error', 400);
                return;
        }
    }
    if (err instanceof SyntaxError && 'body' in err) {
        response_1.ResponseHandler.error(res, 'Invalid JSON format', 400);
        return;
    }
    response_1.ResponseHandler.internalError(res, 'Something went wrong');
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res, next) => {
    response_1.ResponseHandler.notFound(res, `Route ${req.originalUrl} not found`);
};
exports.notFoundHandler = notFoundHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=index.js.map