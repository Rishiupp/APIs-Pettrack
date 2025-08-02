import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../types';
import { ResponseHandler } from '../../utils/response';
import { logger } from '../../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle known application errors
  if (err instanceof AppError) {
    ResponseHandler.error(res, err.message, err.statusCode);
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    switch (prismaError.code) {
      case 'P2002':
        ResponseHandler.conflict(res, 'A record with this information already exists');
        return;
      case 'P2025':
        ResponseHandler.notFound(res, 'Record not found');
        return;
      case 'P2003':
        ResponseHandler.error(res, 'Foreign key constraint failed', 400);
        return;
      default:
        ResponseHandler.internalError(res, 'Database operation failed');
        return;
    }
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    ResponseHandler.error(res, err.message, 400);
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    ResponseHandler.unauthorized(res, 'Invalid token');
    return;
  }

  if (err.name === 'TokenExpiredError') {
    ResponseHandler.unauthorized(res, 'Token expired');
    return;
  }

  // Handle multer errors (file upload)
  if (err.name === 'MulterError') {
    const multerError = err as any;
    
    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE':
        ResponseHandler.error(res, 'File too large', 413);
        return;
      case 'LIMIT_FILE_COUNT':
        ResponseHandler.error(res, 'Too many files', 400);
        return;
      case 'LIMIT_UNEXPECTED_FILE':
        ResponseHandler.error(res, 'Unexpected file field', 400);
        return;
      default:
        ResponseHandler.error(res, 'File upload error', 400);
        return;
    }
  }

  // Handle syntax errors in JSON
  if (err instanceof SyntaxError && 'body' in err) {
    ResponseHandler.error(res, 'Invalid JSON format', 400);
    return;
  }

  // Default error handler
  ResponseHandler.internalError(res, 'Something went wrong');
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  ResponseHandler.notFound(res, `Route ${req.originalUrl} not found`);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};