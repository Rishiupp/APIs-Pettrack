import { UserRole, OTPPurpose } from '@prisma/client';
import prisma from '../../config/database';
import { CryptoUtil } from '../../utils/crypto';
import { JWTUtil, getRolePermissions } from '../../utils/jwt';
import { AppError } from '../../types';
import { config } from '../../config';
import { SMSService } from '../sms/sms.service';
import { EmailService } from '../email/email.service';
import { ValidationUtil } from '../../utils/validation';

export class AuthService {
  static async requestOTP(phone: string, purpose: OTPPurpose) {
    const sanitizedPhone = phone.replace(/\s+/g, '');
    
    // Check if user exists for login, or doesn't exist for registration
    const existingUser = await prisma.user.findUnique({
      where: { phone: sanitizedPhone },
    });

    if (purpose === OTPPurpose.login && !existingUser) {
      throw new AppError('User not found. Please register first.', 404);
    }

    if (purpose === OTPPurpose.registration && existingUser) {
      throw new AppError('User already exists. Please login instead.', 409);
    }

    // Clean up expired OTP codes
    await prisma.oTPCode.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    // Check for existing valid OTP
    const existingOTP = await prisma.oTPCode.findFirst({
      where: {
        userId: existingUser?.id,
        purpose,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingOTP) {
      const timeRemaining = Math.ceil((existingOTP.expiresAt.getTime() - Date.now()) / 1000);
      throw new AppError(`OTP already sent. Please wait ${timeRemaining} seconds.`, 429);
    }

    // Generate new OTP
    const otpCode = CryptoUtil.generateOTP();
    const otpHash = CryptoUtil.hashOTP(otpCode);
    const expiresAt = new Date(Date.now() + config.otp.expiryTime * 1000);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // For registration, we need to create a temporary user record
      // or handle this differently based on your flow
      if (purpose === 'registration') {
        // We'll store OTP without user for now, link it during registration
        // For registration, we'll store OTP temporarily and link it during user creation
        // We need to create a temporary user or modify our approach
        throw new AppError('Please use the complete registration endpoint with user details', 400);
      }
      throw new AppError('User not found', 404);
    }

    // Store OTP
    await prisma.oTPCode.create({
      data: {
        userId,
        codeHash: otpHash,
        purpose,
        expiresAt,
      },
    });

    // Send OTP via SMS
    try {
      await SMSService.sendOTP(sanitizedPhone, otpCode);
    } catch (error) {
      console.error('Failed to send OTP SMS:', error);
      // Continue execution - log OTP for development
      console.log(`OTP for ${sanitizedPhone}: ${otpCode}`);
    }

    return {
      message: 'OTP sent successfully',
      expiresIn: config.otp.expiryTime,
    };
  }

  static async verifyOTPAndLogin(phone: string, code: string) {
    const sanitizedPhone = phone.replace(/\s+/g, '');
    const otpHash = CryptoUtil.hashOTP(code);

    // Find user and valid OTP
    const user = await prisma.user.findUnique({
      where: { phone: sanitizedPhone },
      include: {
        otpCodes: {
          where: {
            codeHash: otpHash,
            purpose: OTPPurpose.login,
            isUsed: false,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user || user.otpCodes.length === 0) {
      throw new AppError('Invalid or expired OTP', 401);
    }

    const otpRecord = user.otpCodes[0];

    if (!otpRecord) {
      throw new AppError('Invalid or expired OTP', 401);
    }

    // Check attempts count
    if (otpRecord.attemptsCount >= otpRecord.maxAttempts) {
      throw new AppError('Maximum OTP attempts exceeded', 429);
    }

    // Mark OTP as used
    await prisma.oTPCode.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    // Update user last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const permissions = getRolePermissions(user.role);
    const accessToken = JWTUtil.generateAccessToken(user.id, user.role, permissions);
    const refreshToken = JWTUtil.generateRefreshToken(user.id);

    // Store refresh token session
    const refreshTokenHash = CryptoUtil.hashOTP(refreshToken);
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      },
    };
  }

  static async register(userData: {
    phone: string;
    email: string;
    firstName: string;
    lastName: string;
    otpCode: string;
  }) {
    const { phone, email, firstName, lastName, otpCode } = userData;
    const sanitizedPhone = phone.replace(/\s+/g, '');

    // Check if active user already exists (ignore inactive temp users)
    const existingActiveUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: sanitizedPhone },
          { email: email.toLowerCase() },
        ],
        isActive: true, // Only check active users
      },
    });

    if (existingActiveUser) {
      throw new AppError('User already exists with this phone or email', 409);  
    }

    try {
      // Clean up any old inactive temp users for this phone
      await prisma.user.deleteMany({
        where: {
          phone: sanitizedPhone,
          isActive: false,
          createdAt: {
            lt: new Date(Date.now() - 10 * 60 * 1000), // Older than 10 minutes
          },
        },
      });

      // Find the most recent temporary user created during OTP request
      let user = await prisma.user.findFirst({
        where: {
          phone: sanitizedPhone,
          isActive: false, // Find inactive temp user
        },
        orderBy: {
          createdAt: 'desc', // Get the most recent one
        },
      });

      console.log(`Debug: Looking for temp user with phone: ${sanitizedPhone}`);
      console.log(`Debug: Found temp user:`, user ? { id: user.id, phone: user.phone, isActive: user.isActive } : 'null');

      if (!user) {
        // Check if there are any users with this phone at all
        const anyUser = await prisma.user.findFirst({
          where: { phone: sanitizedPhone },
        });
        console.log(`Debug: Any user with this phone:`, anyUser ? { id: anyUser.id, phone: anyUser.phone, isActive: anyUser.isActive } : 'null');
        
        throw new AppError('Please request OTP first before registering', 400);
      }

      // Verify the provided OTP
      const otpHash = CryptoUtil.hashOTP(otpCode);
      
      console.log(`Debug: Verifying OTP for user ${user.id}`);
      console.log(`Debug: Looking for OTP with purpose: registration`);
      
      // Find valid OTP for this user
      const validOTP = await prisma.oTPCode.findFirst({
        where: {
          userId: user.id,
          codeHash: otpHash,
          purpose: OTPPurpose.registration,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
      });

      console.log(`Debug: Found valid OTP:`, validOTP ? { id: validOTP.id, isUsed: validOTP.isUsed, expiresAt: validOTP.expiresAt } : 'null');

      if (!validOTP) {
        // Check if there's any OTP for this user (for debug)
        const anyOTP = await prisma.oTPCode.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
        });
        console.log(`Debug: Any OTP for this user:`, anyOTP ? { 
          id: anyOTP.id, 
          purpose: anyOTP.purpose, 
          isUsed: anyOTP.isUsed, 
          expiresAt: anyOTP.expiresAt,
          now: new Date()
        } : 'null');
        
        throw new AppError('Invalid or expired OTP. Please request a new OTP first.', 400);
      }

      // Mark OTP as used
      await prisma.oTPCode.update({
        where: { id: validOTP.id },
        data: { isUsed: true },
      });

      // Update user with complete registration details and activate
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: email.toLowerCase(),
          firstName,
          lastName,
          phoneVerified: true,
          isActive: true,
        },
      });

      // Create pet owner profile
      await prisma.petOwner.create({
        data: {
          userId: user.id,
        },
      });

      // Generate tokens
      const permissions = getRolePermissions(user.role);
      const accessToken = JWTUtil.generateAccessToken(user.id, user.role, permissions);
      const refreshToken = JWTUtil.generateRefreshToken(user.id);

      // Store refresh token session
      const refreshTokenHash = CryptoUtil.hashOTP(refreshToken);
      await prisma.userSession.create({
        data: {
          userId: user.id,
          refreshTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
        },
      };
    } catch (error: any) {
      // Clean up any created resources on error
      throw error;
    }
  }

  static async refreshToken(refreshToken: string) {
    const decoded = JWTUtil.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Find session
    const refreshTokenHash = CryptoUtil.hashOTP(refreshToken);
    const session = await prisma.userSession.findFirst({
      where: {
        userId: decoded.sub,
        refreshTokenHash,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session || !session.user.isActive) {
      throw new AppError('Invalid session or user inactive', 401);
    }

    // Generate new access token
    const permissions = getRolePermissions(session.user.role);
    const newAccessToken = JWTUtil.generateAccessToken(
      session.user.id,
      session.user.role,
      permissions
    );

    // Update session last used
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      accessToken: newAccessToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        phone: session.user.phone,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role: session.user.role,
        emailVerified: session.user.emailVerified,
        phoneVerified: session.user.phoneVerified,
      },
    };
  }

  static async logout(userId: string, refreshToken: string) {
    const refreshTokenHash = CryptoUtil.hashOTP(refreshToken);
    
    // Delete the session
    await prisma.userSession.deleteMany({
      where: {
        userId,
        refreshTokenHash,
      },
    });

    return { message: 'Logged out successfully' };
  }

  static async logoutAllSessions(userId: string) {
    // Delete all sessions for the user
    await prisma.userSession.deleteMany({
      where: { userId },
    });

    return { message: 'Logged out from all devices successfully' };
  }

  static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        petOwner: true,
        executive: true,
        notificationPrefs: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      petOwner: user.petOwner,
      executive: user.executive,
      notificationPreferences: user.notificationPrefs,
    };
  }
}