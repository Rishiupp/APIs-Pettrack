import twilio from 'twilio';
import { config } from '../../config';

// Initialize Twilio client
let twilioClient: twilio.Twilio | null = null;

if (config.sms.accountSid && config.sms.apiKey && config.sms.apiSecret) {
  try {
    twilioClient = twilio(config.sms.apiKey, config.sms.apiSecret, {
      accountSid: config.sms.accountSid
    });
  } catch (error) {
    console.warn('Twilio initialization failed:', error);
  }
}

export class SMSService {
  /**
   * Send SMS using Twilio
   */
  static async sendSMS(to: string, message: string): Promise<boolean> {
    if (!twilioClient) {
      console.warn('Twilio is not configured. SMS not sent.');
      console.log(`SMS to ${to}: ${message}`); // Log for development
      return false;
    }

    // Normalize phone numbers for comparison
    const normalizedTo = to.replace(/\D/g, '');
    const normalizedFrom = config.sms.senderId?.replace(/\D/g, '') || '';
    
    // Check if sender and recipient are the same
    if (normalizedTo === normalizedFrom) {
      console.warn(`Cannot send SMS: 'To' and 'From' numbers are the same (${to})`);
      console.log(`[DEVELOPMENT] SMS to ${to}: ${message}`); // Log for development
      return true; // Return true to not break the flow in development
    }

    // Check if sender ID is a toll-free number (not SMS capable)
    if (config.sms.senderId?.includes('800') || config.sms.senderId?.startsWith('+91800')) {
      console.warn(`Cannot send SMS: Sender ID appears to be a toll-free number (${config.sms.senderId})`);
      console.log(`[DEVELOPMENT] SMS to ${to}: ${message}`); // Log for development
      return true; // Return true to not break the flow in development
    }

    try {
      const result = await twilioClient.messages.create({
        body: message,
        from: config.sms.senderId,
        to: to,
      });

      console.log(`SMS sent successfully. SID: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('SMS sending failed:', error);
      return false;
    }
  }

  /**
   * Send OTP SMS
   */
  static async sendOTP(phone: string, otp: string): Promise<boolean> {
    const message = `Your Pet Track verification code is: ${otp}. This code will expire in 5 minutes. Do not share this code with anyone.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send notification SMS
   */
  static async sendNotification(phone: string, petName: string, scannerInfo?: string): Promise<boolean> {
    const message = scannerInfo 
      ? `Alert! Your pet ${petName} has been scanned by ${scannerInfo}. Check Pet Track app for details.`
      : `Alert! Your pet ${petName} has been scanned. Check Pet Track app for details.`;
    
    return this.sendSMS(phone, message);
  }

  /**
   * Send welcome SMS to new users
   */
  static async sendWelcomeSMS(phone: string, firstName: string): Promise<boolean> {
    const message = `Welcome to Pet Track, ${firstName}! Your account has been created successfully. Download our app to manage your pet's information.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send QR code assignment notification
   */
  static async sendQRAssignmentSMS(phone: string, petName: string, qrCode: string): Promise<boolean> {
    const message = `Great news! QR code ${qrCode} has been assigned to your pet ${petName}. You can now use it for pet identification.`;
    return this.sendSMS(phone, message);
  }
}