"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoUtil = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
class CryptoUtil {
    static async hashPassword(password) {
        return bcryptjs_1.default.hash(password, config_1.config.security.bcryptRounds);
    }
    static async comparePassword(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
    static hashOTP(otp) {
        return crypto_1.default.createHash('sha256').update(otp).digest('hex');
    }
    static generateOTP(length = 6) {
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += digits[Math.floor(Math.random() * digits.length)];
        }
        return otp;
    }
    static generateSecureToken(length = 32) {
        return crypto_1.default.randomBytes(length).toString('hex');
    }
    static generateQRCodeString() {
        const timestamp = Date.now().toString(36);
        const randomPart = crypto_1.default.randomBytes(8).toString('hex');
        return `PET_${timestamp}_${randomPart}`.toUpperCase();
    }
    static hashQRCode(qrString) {
        return crypto_1.default.createHash('sha256').update(qrString).digest('hex');
    }
    static generateTicketNumber() {
        const timestamp = Date.now().toString().slice(-6);
        const randomPart = crypto_1.default.randomBytes(2).toString('hex').toUpperCase();
        return `TKT${timestamp}${randomPart}`;
    }
    static verifyRazorpaySignature(orderId, paymentId, signature, secret) {
        const body = orderId + '|' + paymentId;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', secret)
            .update(body.toString())
            .digest('hex');
        return expectedSignature === signature;
    }
    static verifyWebhookSignature(payload, signature, secret) {
        const expectedSignature = crypto_1.default
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        return expectedSignature === signature;
    }
}
exports.CryptoUtil = CryptoUtil;
//# sourceMappingURL=crypto.js.map