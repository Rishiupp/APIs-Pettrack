import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../../types';
export declare const authorize: (allowedRoles: UserRole[], requiredPermissions?: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requireExecutive: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requirePetOwner: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requireAuthenticated: (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=authorize.d.ts.map