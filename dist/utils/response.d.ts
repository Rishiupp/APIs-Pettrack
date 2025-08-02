import { Response } from 'express';
import { PaginationMeta, ValidationError } from '../types';
export declare class ResponseHandler {
    static success<T>(res: Response, data?: T, message?: string, statusCode?: number, meta?: PaginationMeta): Response;
    static error(res: Response, message: string, statusCode?: number, errors?: ValidationError[]): Response;
    static validationError(res: Response, errors: ValidationError[], message?: string): Response;
    static notFound(res: Response, message?: string): Response;
    static unauthorized(res: Response, message?: string): Response;
    static forbidden(res: Response, message?: string): Response;
    static conflict(res: Response, message?: string): Response;
    static tooManyRequests(res: Response, message?: string): Response;
    static internalError(res: Response, message?: string): Response;
    static created<T>(res: Response, data?: T, message?: string): Response;
    static noContent(res: Response): Response;
}
//# sourceMappingURL=response.d.ts.map