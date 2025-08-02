import { JWTPayload } from '../types';
import { UserRole } from '@prisma/client';
export declare class JWTUtil {
    static generateAccessToken(userId: string, role: UserRole, permissions: string[]): string;
    static generateRefreshToken(userId: string): string;
    static verifyAccessToken(token: string): JWTPayload | null;
    static verifyRefreshToken(token: string): {
        sub: string;
        type: string;
    } | null;
    static decodeToken(token: string): JWTPayload | null;
    static isTokenExpired(token: string): boolean;
    static getTokenExpiryTime(token: string): Date | null;
}
export declare const getRolePermissions: (role: UserRole) => string[];
//# sourceMappingURL=jwt.d.ts.map