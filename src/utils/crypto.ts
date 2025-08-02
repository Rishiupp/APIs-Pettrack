import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config';

export class CryptoUtil {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.security.bcryptRounds);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static hashOTP(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  static generateOTP(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    
    return otp;
  }

  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateQRCodeString(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = crypto.randomBytes(8).toString('hex');
    return `PET_${timestamp}_${randomPart}`.toUpperCase();
  }

  static hashQRCode(qrString: string): string {
    return crypto.createHash('sha256').update(qrString).digest('hex');
  }

  static generateTicketNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `TKT${timestamp}${randomPart}`;
  }

  static verifyRazorpaySignature(
    orderId: string,
    paymentId: string,
    signature: string,
    secret: string
  ): boolean {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');
    
    return expectedSignature === signature;
  }

  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return expectedSignature === signature;
  }
}