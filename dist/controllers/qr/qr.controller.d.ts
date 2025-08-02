import { Request, Response } from 'express';
export declare class QRController {
    static getAvailableQRCodes: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static assignQRToPet: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static scanQRCode: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getPetQRCodes: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getPetScanHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static activateQRCode: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=qr.controller.d.ts.map