import { Request, Response } from 'express';
export declare class AdminController {
    static getDashboardOverview: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getPetAnalytics: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getQRAnalytics: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getRevenueAnalytics: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getUserAnalytics: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static createQRCodePool: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static generateQRCodes: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getQRCodePools: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getAllUsers: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static suspendUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static reactivateUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getSystemStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=admin.controller.d.ts.map