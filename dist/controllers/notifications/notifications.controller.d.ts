import { Request, Response } from 'express';
export declare class NotificationsController {
    static registerDevice: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static updatePreferences: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getPreferences: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getNotifications: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static markAsRead: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static markAllAsRead: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static deleteNotification: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static sendTestNotification: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=notifications.controller.d.ts.map