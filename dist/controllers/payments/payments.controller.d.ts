import { Request, Response } from 'express';
export declare class PaymentsController {
    static createOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static verifyPayment: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static handleWebhook: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getPaymentHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static initiateRefund: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=payments.controller.d.ts.map