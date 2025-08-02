import { PaymentOrder, PaymentVerification } from '../../types';
export declare class RazorpayService {
    private static razorpay;
    static createPaymentOrder(userId: string, orderData: PaymentOrder): Promise<{
        paymentEventId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        createdAt: number;
    }>;
    static verifyPayment(paymentEventId: string, verificationData: PaymentVerification): Promise<{
        paymentEvent: {
            id: string;
            createdAt: Date;
            userId: string | null;
            status: import(".prisma/client").$Enums.PaymentStatus;
            petId: string | null;
            qrId: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            paymentPurpose: import(".prisma/client").$Enums.PaymentPurpose;
            razorpayOrderId: string | null;
            razorpayPaymentId: string | null;
            razorpaySignature: string | null;
            paymentMethod: string | null;
            failureReason: string | null;
            completedAt: Date | null;
        };
        message: string;
    }>;
    static handleWebhook(payload: any, signature: string): Promise<{
        message: string;
    }>;
    private static validatePaymentOrder;
    private static processPostPaymentActions;
    private static processQRRegistrationPayment;
    private static processPremiumFeaturesPayment;
    private static processVetConsultationPayment;
    private static processWebhookEvent;
    private static handlePaymentCaptured;
    private static handlePaymentFailed;
    private static handleOrderPaid;
    static getPaymentHistory(userId: string, page?: number, limit?: number): Promise<{
        payments: ({
            pet: {
                name: string;
                id: string;
            } | null;
            qrCode: {
                id: string;
                status: import(".prisma/client").$Enums.QRStatus;
                qrCodeString: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            userId: string | null;
            status: import(".prisma/client").$Enums.PaymentStatus;
            petId: string | null;
            qrId: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            paymentPurpose: import(".prisma/client").$Enums.PaymentPurpose;
            razorpayOrderId: string | null;
            razorpayPaymentId: string | null;
            razorpaySignature: string | null;
            paymentMethod: string | null;
            failureReason: string | null;
            completedAt: Date | null;
        })[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    static initiateRefund(paymentEventId: string, refundAmount: number, reason: string, initiatedBy: string): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.RefundStatus;
        paymentEventId: string;
        razorpayRefundId: string | null;
        refundAmount: import("@prisma/client/runtime/library").Decimal;
        reason: string | null;
        initiatedBy: string | null;
        processedAt: Date | null;
    }>;
}
//# sourceMappingURL=razorpay.service.d.ts.map