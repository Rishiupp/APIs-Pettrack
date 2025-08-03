import { Request, Response } from 'express';
export declare class AuthController {
    static register: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static requestOTP: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static verifyOTP: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static refreshToken: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static logout: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static logoutAll: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getProfile: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static googleLogin: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static appleLogin: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=auth.controller.d.ts.map