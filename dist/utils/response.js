"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseHandler = void 0;
class ResponseHandler {
    static success(res, data, message, statusCode = 200, meta) {
        const response = {
            success: true,
            data,
            message,
            meta,
        };
        return res.status(statusCode).json(response);
    }
    static error(res, message, statusCode = 500, errors) {
        const response = {
            success: false,
            error: message,
            errors,
        };
        return res.status(statusCode).json(response);
    }
    static validationError(res, errors, message = 'Validation failed') {
        return this.error(res, message, 400, errors);
    }
    static notFound(res, message = 'Resource not found') {
        return this.error(res, message, 404);
    }
    static unauthorized(res, message = 'Unauthorized') {
        return this.error(res, message, 401);
    }
    static forbidden(res, message = 'Forbidden') {
        return this.error(res, message, 403);
    }
    static conflict(res, message = 'Conflict') {
        return this.error(res, message, 409);
    }
    static tooManyRequests(res, message = 'Too many requests') {
        return this.error(res, message, 429);
    }
    static internalError(res, message = 'Internal server error') {
        return this.error(res, message, 500);
    }
    static created(res, data, message = 'Created successfully') {
        return this.success(res, data, message, 201);
    }
    static noContent(res) {
        return res.status(204).send();
    }
}
exports.ResponseHandler = ResponseHandler;
//# sourceMappingURL=response.js.map