import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { JWTPayload } from '../types';
import { UserRole } from '@prisma/client';

export class JWTUtil {
  static generateAccessToken(userId: string, role: UserRole, permissions: string[]): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: userId,
      role,
      permissions,
    };

    const options: SignOptions = {
      expiresIn: config.jwt.expiresIn as any,
      issuer: config.app.name,
      audience: config.app.name,
    };
    
    return jwt.sign(payload, config.jwt.secret, options);
  }

  static generateRefreshToken(userId: string): string {
    const options: SignOptions = {
      expiresIn: config.jwt.refreshExpiresIn as any,
      issuer: config.app.name,
      audience: config.app.name,
    };
    
    return jwt.sign(
      { sub: userId, type: 'refresh' },
      config.jwt.secret,
      options
    );
  }

  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: config.app.name,
        audience: config.app.name,
      }) as JWTPayload;

      // Additional validation: ensure it's not a refresh token
      if ((decoded as any).type === 'refresh') {
        console.error('Refresh token used as access token');
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('JWT verification failed:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  static verifyRefreshToken(token: string): { sub: string; type: string } | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: config.app.name,
        audience: config.app.name,
      }) as { sub: string; type: string };

      if (decoded.type !== 'refresh') {
        console.error('Non-refresh token used as refresh token');
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('Refresh token verification failed:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }

  static getTokenExpiryTime(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (!decoded) return null;

    return new Date(decoded.exp * 1000);
  }
}

export const getRolePermissions = (role: UserRole): string[] => {
  switch (role) {
    case UserRole.admin:
      return [
        'users:read',
        'users:write',
        'users:delete',
        'pets:read',
        'pets:write',
        'pets:delete',
        'qr:read',
        'qr:write',
        'qr:generate',
        'payments:read',
        'payments:write',
        'analytics:read',
        'support:read',
        'support:write',
        'support:assign',
        'notifications:send',
        'system:manage',
      ];

    case UserRole.executive:
      return [
        'pets:read',
        'pets:write',
        'pets:register',
        'qr:read',
        'qr:assign',
        'payments:read',
        'payments:write',
        'registrations:read',
        'support:read',
        'support:write',
      ];

    case UserRole.pet_owner:
      return [
        'pets:read',
        'pets:write',
        'pets:own',
        'qr:read',
        'qr:scan',
        'payments:read',
        'payments:write',
        'notifications:read',
        'support:read',
        'support:write',
        'profile:read',
        'profile:write',
      ];

    default:
      return [];
  }
};