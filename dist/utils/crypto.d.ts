export declare class CryptoUtil {
    static hashPassword(password: string): Promise<string>;
    static comparePassword(password: string, hash: string): Promise<boolean>;
    static hashOTP(otp: string): string;
    static generateOTP(length?: number): string;
    static generateSecureToken(length?: number): string;
    static generateQRCodeString(): string;
    static hashQRCode(qrString: string): string;
    static generateTicketNumber(): string;
    static verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean;
    static verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
}
//# sourceMappingURL=crypto.d.ts.map