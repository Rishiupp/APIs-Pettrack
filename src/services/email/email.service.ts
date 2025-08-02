import nodemailer from 'nodemailer';
import { config } from '../../config';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

if (config.email.user && config.email.pass) {
  try {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465, // true for 465, false for other ports
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  } catch (error) {
    console.warn('Email service initialization failed:', error);
  }
}

export class EmailService {
  /**
   * Send email using Nodemailer
   */
  static async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    if (!transporter) {
      console.warn('Email service is not configured. Email not sent.');
      console.log(`Email to ${to}: ${subject}`); // Log for development
      return false;
    }

    try {
      const mailOptions = {
        from: `"Pet Track" <${config.email.user}>`,
        to,
        subject,
        text: text || '',
        html,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully. Message ID: ${result.messageId}`);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  /**
   * Send OTP email
   */
  static async sendOTP(email: string, otp: string, firstName?: string): Promise<boolean> {
    const subject = 'Your Pet Track Verification Code';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pet Track - Verification Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
          .otp-box { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 4px; }
          .footer { margin-top: 30px; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🐾 Pet Track</div>
          </div>
          
          <h2>Hello${firstName ? ` ${firstName}` : ''}!</h2>
          
          <p>Your Pet Track verification code is:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          
          <p><strong>This code will expire in 5 minutes.</strong></p>
          
          <p>If you didn't request this code, please ignore this email.</p>
          
          <div class="footer">
            <p>© 2025 Pet Track. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `Hello${firstName ? ` ${firstName}` : ''}!\n\nYour Pet Track verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this code, please ignore this email.\n\n© 2025 Pet Track. All rights reserved.`;

    return this.sendEmail(email, subject, html, text);
  }

  /**
   * Send welcome email to new users
   */
  static async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    const subject = 'Welcome to Pet Track!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Pet Track</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
          .footer { margin-top: 30px; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🐾 Pet Track</div>
          </div>
          
          <h2>Welcome to Pet Track, ${firstName}!</h2>
          
          <p>Your account has been created successfully. You can now:</p>
          
          <ul>
            <li>Register your pets</li>
            <li>Generate QR codes for pet identification</li>
            <li>Track your pet's location and activities</li>
            <li>Receive notifications when your pet is scanned</li>
          </ul>
          
          <p>Thank you for choosing Pet Track to keep your furry friends safe!</p>
          
          <div class="footer">
            <p>© 2025 Pet Track. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `Welcome to Pet Track, ${firstName}!\n\nYour account has been created successfully. You can now:\n\n- Register your pets\n- Generate QR codes for pet identification\n- Track your pet's location and activities\n- Receive notifications when your pet is scanned\n\nThank you for choosing Pet Track to keep your furry friends safe!\n\n© 2025 Pet Track. All rights reserved.`;

    return this.sendEmail(email, subject, html, text);
  }

  /**
   * Send notification email
   */
  static async sendNotificationEmail(email: string, title: string, message: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pet Track - ${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
          .footer { margin-top: 30px; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🐾 Pet Track</div>
          </div>
          
          <h2>${title}</h2>
          <p>${message}</p>
          
          <div class="footer">
            <p>© 2025 Pet Track. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `${title}\n\n${message}\n\n© 2025 Pet Track. All rights reserved.`;

    return this.sendEmail(email, title, html, text);
  }
}