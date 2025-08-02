import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../../types';
import { ResponseHandler } from '../../utils/response';

export const authorize = (
  allowedRoles: UserRole[],
  requiredPermissions?: string[]
) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        ResponseHandler.unauthorized(res, 'Authentication required');
        return;
      }

      // Check role authorization
      if (!allowedRoles.includes(req.user.role)) {
        ResponseHandler.forbidden(res, 'Insufficient permissions');
        return;
      }

      // Check specific permissions if provided
      if (requiredPermissions && requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(permission =>
          req.user!.permissions.includes(permission)
        );

        if (!hasAllPermissions) {
          ResponseHandler.forbidden(res, 'Missing required permissions');
          return;
        }
      }

      next();
    } catch (error) {
      ResponseHandler.internalError(res, 'Authorization check failed');
    }
  };
};

// Convenience functions for common role checks
export const requireAdmin = authorize([UserRole.admin]);

export const requireExecutive = authorize([UserRole.executive, UserRole.admin]);

export const requirePetOwner = authorize([
  UserRole.pet_owner,
  UserRole.executive,
  UserRole.admin,
]);

export const requireAuthenticated = authorize([
  UserRole.pet_owner,
  UserRole.executive,
  UserRole.admin,
]);