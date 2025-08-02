import { Request, Response, NextFunction } from 'express';
import { JWTUtil } from '../../utils/jwt';
import { ResponseHandler } from '../../utils/response';
import { AuthRequest } from '../../types';
import prisma from '../../config/database';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ResponseHandler.unauthorized(res, 'Access token required');
      return;
    }

    const token = authHeader.substring(7);
    
    // First check if token is expired without secret verification
    if (JWTUtil.isTokenExpired(token)) {
      ResponseHandler.unauthorized(res, 'Token has expired');
      return;
    }
    
    const payload = JWTUtil.verifyAccessToken(token);

    if (!payload) {
      ResponseHandler.unauthorized(res, 'Invalid or expired token');
      return;
    }

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      ResponseHandler.unauthorized(res, 'User account not found or inactive');
      return;
    }

    // Add user info to request
    req.user = {
      id: user.id,
      role: user.role,
      permissions: payload.permissions,
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    ResponseHandler.unauthorized(res, 'Authentication failed');
  }
};