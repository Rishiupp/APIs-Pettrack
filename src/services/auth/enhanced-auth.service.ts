import { UserRole, OTPPurpose, AuthProvider } from '@prisma/client';
import prisma from '../../config/database';
import { CryptoUtil } from '../../utils/crypto';
import { JWTUtil, getRolePermissions } from '../../utils/jwt';
import { AppError } from '../../types';
import { config } from '../../config';
import { SMSService } from '../sms/sms.service';
import { EmailService } from '../email/email.service';
import { ValidationUtil } from '../../utils/validation';

export class EnhancedAuthService {
  /**
   * Request OTP for phone or email - Enhanced to send to both when available
   */
  static async requestOTP(identifier: string, purpose: OTPPurpose, deliveryMethod?: 'phone' | 'email' | 'both', additionalData?: { email?: string; phone?: string }) {
    // Determine if identifier is phone or email
    const isEmail = ValidationUtil.validateEmail(identifier) === null;
    const isPhone = ValidationUtil.validatePhone(identifier) === null;
    
    if (!isEmail && !isPhone) {
      throw new AppError('Invalid phone number or email address', 400);
    }

    // Sanitize identifier
    const sanitizedIdentifier = isEmail 
      ? identifier.toLowerCase().trim()
      : identifier.replace(/\s+/g, '');

    // Check rate limiting - only 3 attempts per 2 minutes
    const whereClause = isEmail 
      ? { email: sanitizedIdentifier }
      : { phone: sanitizedIdentifier };

    const recentAttempts = await prisma.oTPCode.count({
      where: {
        user: whereClause,
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        },
      },
    });

    if (recentAttempts >= 6) { // Increased limit for dual delivery
      throw new AppError('Too many OTP requests. Please try again after 2 minutes.', 429);
    }

    // Find existing user
    const existingUser = await prisma.user.findUnique({
      where: whereClause,
    });

    if (purpose === OTPPurpose.login && !existingUser) {
      throw new AppError('User not found. Please register first.', 404);
    }

    if (purpose === OTPPurpose.registration) {
      if (existingUser && existingUser.isActive) {
        throw new AppError('User already exists. Please login instead.', 409);
      }
      // Allow OTP for inactive users (temp users created during registration)
    }

    // Clean up expired OTP codes
    await prisma.oTPCode.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    // Check for existing valid OTP (only if user exists)
    if (existingUser) {
      const existingOTP = await prisma.oTPCode.findFirst({
        where: {
          userId: existingUser.id,
          purpose,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
      });

      console.log(`Debug: Checking existing OTP for user ${existingUser.id}`);
      console.log(`Debug: Found existing OTP:`, existingOTP ? 'yes' : 'no');

      if (existingOTP) {
        throw new AppError('OTP already sent. Please wait before requesting a new one.', 429);
      }
    }

    // Generate OTP codes
    const phoneOtp = CryptoUtil.generateOTP(6);
    const emailOtp = CryptoUtil.generateOTP(6);
    const expiresAt = new Date(Date.now() + config.otp.expiryTime * 1000);

    let userId: string;
    let targetUser = existingUser;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // For registration, create a temporary inactive user to store OTP
      if (purpose === OTPPurpose.registration) {
        // First, clean up any old temp users for this identifier
        await prisma.user.deleteMany({
          where: {
            ...(isPhone ? { phone: sanitizedIdentifier } : { email: sanitizedIdentifier }),
            isActive: false,
            createdAt: {
              lt: new Date(Date.now() - 2 * 60 * 1000), // Older than 2 minutes
            },
          },
        });

        // Check if there's a recent temp user (to prevent spam)
        const recentTempUser = await prisma.user.findFirst({
          where: {
            ...(isPhone ? { phone: sanitizedIdentifier } : { email: sanitizedIdentifier }),
            isActive: false,
          },
          include: {
            otpCodes: {
              where: {
                purpose,
                isUsed: false,
                expiresAt: { gt: new Date() },
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });

        if (recentTempUser && recentTempUser.otpCodes.length > 0) {
          throw new AppError('OTP already sent. Please wait before requesting a new one.', 429);
        }

        // Use existing temp user or create new one
        targetUser = recentTempUser || await prisma.user.create({
          data: {
            phone: isPhone ? sanitizedIdentifier : (additionalData?.phone ? ValidationUtil.sanitizePhone(additionalData.phone) : null),
            email: isEmail ? sanitizedIdentifier : (additionalData?.email ? additionalData.email.toLowerCase().trim() : null),
            firstName: 'Temp', // Will be updated during registration
            lastName: 'User', // Will be updated during registration
            role: UserRole.pet_owner,
            phoneVerified: false,
            emailVerified: false,
            isActive: false, // Mark as inactive until registration completes
          },
        });
        userId = targetUser.id;
      } else {
        throw new AppError('User not found', 404);
      }
    }

    // For registration requests, send OTP to both phone and email if both are available
    const deliveryMethods: Array<'phone' | 'email'> = [];
    const otpCodes: { method: 'phone' | 'email'; code: string; hash: string }[] = [];

    if (purpose === OTPPurpose.registration) {
      // For registration during /register endpoint (phone provided)
      if (targetUser?.phone) {
        deliveryMethods.push('phone');
        otpCodes.push({ method: 'phone', code: phoneOtp, hash: CryptoUtil.hashOTP(phoneOtp) });
      }
      if (targetUser?.email) {
        deliveryMethods.push('email');
        otpCodes.push({ method: 'email', code: emailOtp, hash: CryptoUtil.hashOTP(emailOtp) });
      }
    } else {
      // For login, determine method based on identifier or deliveryMethod
      const method = deliveryMethod && deliveryMethod !== 'both' 
        ? deliveryMethod 
        : (isEmail ? 'email' : 'phone');
      
      deliveryMethods.push(method);
      const code = method === 'email' ? emailOtp : phoneOtp;
      otpCodes.push({ method, code, hash: CryptoUtil.hashOTP(code) });
    }

    // Store OTP codes in database
    for (const otpData of otpCodes) {
      await prisma.oTPCode.create({
        data: {
          userId,
          codeHash: otpData.hash,
          purpose,
          deliveryMethod: otpData.method,
          expiresAt,
        },
      });
    }

    // Send OTP via appropriate methods
    const sendResults: string[] = [];
    
    try {
      for (const otpData of otpCodes) {
        if (otpData.method === 'email' && targetUser?.email) {
          await EmailService.sendOTP(targetUser.email, otpData.code, targetUser?.firstName);
          sendResults.push('email');
          console.log(`OTP sent to email ${targetUser.email}: ${otpData.code}`);
        } else if (otpData.method === 'phone' && targetUser?.phone) {
          await SMSService.sendOTP(targetUser.phone, otpData.code);
          sendResults.push('phone');
          console.log(`OTP sent to phone ${targetUser.phone}: ${otpData.code}`);
        }
      }
    } catch (error) {
      console.error('Failed to send OTP:', error);
      // Continue execution - log OTP for development
      for (const otpData of otpCodes) {
        console.log(`OTP for ${otpData.method}: ${otpData.code}`);
      }
    }

    console.log(`Debug: Created OTPs for user ${userId}, expires: ${expiresAt}`);

    return {
      message: sendResults.length > 1 
        ? 'OTP sent to both phone and email' 
        : `OTP sent to ${sendResults[0] || 'your device'}`,
      expiresIn: config.otp.expiryTime,
      deliveryMethods: sendResults,
    };
  }

  /**
   * Complete registration after OTP verification
   */
  static async completeRegistration(userData: {
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
            lt: new Date(Date.now() - 2 * 60 * 1000), // Older than 2 minutes
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
        throw new AppError('Please request OTP first before registering', 400);
      }

      // Verify the provided OTP
      const otpHash = CryptoUtil.hashOTP(otpCode);
      
      console.log(`Debug: Verifying OTP for user ${user.id}`);
      console.log(`Debug: Looking for OTP with purpose: registration`);
      
      // Find valid OTP for this user (check both phone and email OTPs)
      const validOTP = await prisma.oTPCode.findFirst({
        where: {
          userId: user.id,
          codeHash: otpHash,
          purpose: OTPPurpose.registration,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
      });

      console.log(`Debug: Found valid OTP:`, validOTP ? { id: validOTP.id, isUsed: validOTP.isUsed, expiresAt: validOTP.expiresAt, method: validOTP.deliveryMethod } : 'null');

      if (!validOTP) {
        throw new AppError('Invalid or expired OTP. Please request a new OTP first.', 400);
      }

      // Mark all OTP codes for this user and purpose as used (both phone and email)
      await prisma.oTPCode.updateMany({
        where: {
          userId: user.id,
          purpose: OTPPurpose.registration,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
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

      // Don't generate tokens here - user should login after registration
      return {
        success: true,
        message: 'Registration completed successfully. Please login to continue.',
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

  /**
   * Verify OTP and login
   */
  static async verifyOTPAndLogin(identifier: string, otpCode: string) {
    // Determine if identifier is phone or email
    const isEmail = ValidationUtil.validateEmail(identifier) === null;
    const sanitizedIdentifier = isEmail 
      ? identifier.toLowerCase().trim()
      : identifier.replace(/\s+/g, '');

    const whereClause = isEmail 
      ? { email: sanitizedIdentifier }
      : { phone: sanitizedIdentifier };

    const user = await prisma.user.findUnique({
      where: whereClause,
      include: {
        petOwner: true,
        executive: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Find valid OTP (check all OTPs for this user)
    const hashedInputOTP = CryptoUtil.hashOTP(otpCode);
    const otpRecord = await prisma.oTPCode.findFirst({
      where: {
        userId: user.id,
        codeHash: hashedInputOTP,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      // Check if there are any valid OTPs to increment attempts
      const anyValidOTP = await prisma.oTPCode.findFirst({
        where: {
          userId: user.id,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (anyValidOTP) {
        // Increment attempt count for the latest OTP
        if (anyValidOTP.attemptsCount < anyValidOTP.maxAttempts) {
          await prisma.oTPCode.update({
            where: { id: anyValidOTP.id },
            data: { attemptsCount: anyValidOTP.attemptsCount + 1 },
          });
        }
      }
      
      throw new AppError('Invalid or expired OTP', 400);
    }

    // Check attempt count
    if (otpRecord.attemptsCount >= otpRecord.maxAttempts) {
      throw new AppError('Maximum OTP attempts exceeded', 400);
    }

    // Mark all valid OTP codes for this user as used (both phone and email)
    await prisma.oTPCode.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      data: { isUsed: true },
    });

    // Update user's last login and verification status
    const updateData: any = { lastLogin: new Date() };
    if (isEmail) {
      updateData.emailVerified = true;
    } else {
      updateData.phoneVerified = true;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    // Generate tokens
    const permissions = getRolePermissions(user.role);
    const accessToken = JWTUtil.generateAccessToken(user.id, user.role, permissions);
    const refreshToken = JWTUtil.generateRefreshToken(user.id);

    // Store session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: CryptoUtil.hashOTP(refreshToken),
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
        profilePicture: user.profilePicture,
        authProvider: user.authProvider,
      },
      permissions,
    };
  }

  /**
   * Google OAuth login
   */
  static async googleLogin(idToken: string) {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    try {
      // Verify Google ID token
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError('Invalid Google token', 400);
      }

      const { sub: googleId, email, given_name: firstName, family_name: lastName, picture } = payload;

      if (!email || !firstName) {
        throw new AppError('Incomplete Google profile data', 400);
      }

      // Find or create user
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId },
            { email },
          ],
        },
        include: {
          petOwner: true,
          executive: true,
        },
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            firstName,
            lastName: lastName || '',
            googleId,
            profilePicture: picture,
            authProvider: AuthProvider.google,
            emailVerified: true,
            lastLogin: new Date(),
          },
          include: {
            petOwner: true,
            executive: true,
          },
        });

        // Create pet owner profile by default
        await prisma.petOwner.create({
          data: {
            userId: user.id,
          },
        });

        // Send welcome email
        try {
          await EmailService.sendWelcomeEmail(email, firstName);
        } catch (error) {
          console.error('Failed to send welcome email:', error);
        }
      } else {
        // Update existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            profilePicture: picture,
            lastLogin: new Date(),
            emailVerified: true,
          },
          include: {
            petOwner: true,
            executive: true,
          },
        });
      }

      // Generate tokens
      const permissions = getRolePermissions(user.role);
      const accessToken = JWTUtil.generateAccessToken(user.id, user.role, permissions);
      const refreshToken = JWTUtil.generateRefreshToken(user.id);

      // Store session
      await prisma.userSession.create({
        data: {
          userId: user.id,
          refreshTokenHash: CryptoUtil.hashOTP(refreshToken),
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
          profilePicture: user.profilePicture,
          authProvider: user.authProvider,
        },
        permissions,
        isNewUser: !user.lastLogin,
      };
    } catch (error) {
      console.error('Google login error:', error);
      throw new AppError('Google authentication failed', 400);
    }
  }

  /**
   * Apple Sign-In login
   */
  static async appleLogin(idToken: string) {
    const jwt = require('jsonwebtoken');
    const { default: fetch } = require('node-fetch');

    try {
      // Get Apple's public keys
      const response = await fetch('https://appleid.apple.com/auth/keys');
      const { keys } = await response.json();

      // Decode token header to get kid
      const header = jwt.decode(idToken, { complete: true })?.header;
      if (!header?.kid) {
        throw new AppError('Invalid Apple token', 400);
      }

      // Find the correct key
      const key = keys.find((k: any) => k.kid === header.kid);
      if (!key) {
        throw new AppError('Invalid Apple token signature', 400);
      }

      // Verify and decode token
      const payload = jwt.verify(idToken, key, {
        algorithms: ['RS256'],
        audience: process.env.APPLE_CLIENT_ID,
        issuer: 'https://appleid.apple.com',
      });

      const { sub: appleId, email, email_verified } = payload;

      if (!appleId) {
        throw new AppError('Invalid Apple token data', 400);
      }

      // Find or create user
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { appleId },
            ...(email ? [{ email }] : []),
          ],
        },
        include: {
          petOwner: true,
          executive: true,
        },
      });

      if (!user) {
        // For Apple Sign-In, email might not be provided on subsequent logins
        if (!email) {
          throw new AppError('Email is required for first-time Apple Sign-In', 400);
        }

        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            firstName: 'Apple', // Apple doesn't always provide name
            lastName: 'User',
            appleId,
            authProvider: AuthProvider.apple,
            emailVerified: email_verified || false,
            lastLogin: new Date(),
          },
          include: {
            petOwner: true,
            executive: true,
          },
        });

        // Create pet owner profile by default
        await prisma.petOwner.create({
          data: {
            userId: user.id,
          },
        });

        // Send welcome email if email is available
        if (email) {
          try {
            await EmailService.sendWelcomeEmail(email, user.firstName);
          } catch (error) {
            console.error('Failed to send welcome email:', error);
          }
        }
      } else {
        // Update existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            appleId,
            lastLogin: new Date(),
            ...(email_verified && { emailVerified: true }),
          },
          include: {
            petOwner: true,
            executive: true,
          },
        });
      }

      // Generate tokens
      const permissions = getRolePermissions(user.role);
      const accessToken = JWTUtil.generateAccessToken(user.id, user.role, permissions);
      const refreshToken = JWTUtil.generateRefreshToken(user.id);

      // Store session
      await prisma.userSession.create({
        data: {
          userId: user.id,
          refreshTokenHash: CryptoUtil.hashOTP(refreshToken),
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
          profilePicture: user.profilePicture,
          authProvider: user.authProvider,
        },
        permissions,
        isNewUser: !user.lastLogin,
      };
    } catch (error) {
      console.error('Apple login error:', error);
      throw new AppError('Apple authentication failed', 400);
    }
  }

  // Re-export existing methods from original AuthService
  static async refreshToken(refreshToken: string) {
    // Implementation from original service
    const decoded = JWTUtil.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Hash the refresh token first
    const refreshTokenHash = CryptoUtil.hashOTP(refreshToken);

    const session = await prisma.userSession.findFirst({
      where: {
        userId: decoded.sub,
        refreshTokenHash: refreshTokenHash,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      throw new AppError('Invalid refresh token', 401);
    }

    const permissions = getRolePermissions(session.user.role);
    const newAccessToken = JWTUtil.generateAccessToken(session.user.id, session.user.role, permissions);

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
        profilePicture: session.user.profilePicture,
        authProvider: session.user.authProvider,
      },
      permissions,
    };
  }

  static async logout(userId: string, refreshToken: string) {
    const hashedToken = CryptoUtil.hashOTP(refreshToken);
    await prisma.userSession.deleteMany({
      where: {
        userId,
        refreshTokenHash: hashedToken,
      },
    });
  }

  static async logoutAllSessions(userId: string) {
    await prisma.userSession.deleteMany({
      where: { userId },
    });
  }

  static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        petOwner: {
          include: {
            pets: {
              include: {
                species: true,
                breed: true,
              },
            },
          },
        },
        executive: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }
}