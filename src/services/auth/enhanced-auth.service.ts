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
   * Request OTP for phone or email
   */
  static async requestOTP(identifier: string, purpose: OTPPurpose, deliveryMethod?: 'phone' | 'email') {
    // Determine if identifier is phone or email
    const isEmail = ValidationUtil.validateEmail(identifier) === null;
    const isPhone = ValidationUtil.validatePhone(identifier) === null;
    
    if (!isEmail && !isPhone) {
      throw new AppError('Invalid phone number or email address', 400);
    }

    // Set delivery method based on identifier type if not specified
    const method = deliveryMethod || (isEmail ? 'email' : 'phone');
    
    // Sanitize identifier
    const sanitizedIdentifier = isEmail 
      ? identifier.toLowerCase().trim()
      : identifier.replace(/\s+/g, '');

    // Check rate limiting - only 3 attempts per 10 minutes
    const whereClause = isEmail 
      ? { email: sanitizedIdentifier }
      : { phone: sanitizedIdentifier };

    const recentAttempts = await prisma.oTPCode.count({
      where: {
        user: whereClause,
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        },
      },
    });

    if (recentAttempts >= 3) {
      throw new AppError('Too many OTP requests. Please try again after 10 minutes.', 429);
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

    // Generate OTP
    const otpCode = CryptoUtil.generateOTP(6);
    const hashedOTP = CryptoUtil.hashOTP(otpCode);
    const expiresAt = new Date(Date.now() + config.otp.expiryTime * 1000);

    let userId: string;

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
              lt: new Date(Date.now() - 10 * 60 * 1000), // Older than 10 minutes
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
        const tempUser = recentTempUser || await prisma.user.create({
          data: {
            phone: isPhone ? sanitizedIdentifier : null,
            email: isEmail ? sanitizedIdentifier : null,
            firstName: 'Temp', // Will be updated during registration
            lastName: 'User', // Will be updated during registration
            role: UserRole.pet_owner,
            phoneVerified: false,
            emailVerified: false,
            isActive: false, // Mark as inactive until registration completes
          },
        });
        userId = tempUser.id;
      } else {
        throw new AppError('User not found', 404);
      }
    }

    // Store OTP
    await prisma.oTPCode.create({
      data: {
        userId,
        codeHash: hashedOTP,
        purpose,
        deliveryMethod: method,
        expiresAt,
      },
    });

    // Send OTP via appropriate method
    try {
      if (method === 'email') {
        await EmailService.sendOTP(sanitizedIdentifier, otpCode, existingUser?.firstName);
      } else {
        await SMSService.sendOTP(sanitizedIdentifier, otpCode);
      }
    } catch (error) {
      console.error('Failed to send OTP:', error);
      // Continue execution - log OTP for development
      console.log(`OTP for ${sanitizedIdentifier}: ${otpCode}`);
    }

    console.log(`Debug: Created OTP for user ${userId}, code: ${otpCode}, expires: ${expiresAt}`);

    return {
      message: 'OTP sent successfully',
      expiresIn: config.otp.expiryTime,
      deliveryMethod: method,
    };
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

    // Find valid OTP
    const otpRecord = await prisma.oTPCode.findFirst({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    // Check attempt count
    if (otpRecord.attemptsCount >= otpRecord.maxAttempts) {
      throw new AppError('Maximum OTP attempts exceeded', 400);
    }

    // Verify OTP
    const hashedInputOTP = CryptoUtil.hashOTP(otpCode);
    const isValidOTP = hashedInputOTP === otpRecord.codeHash;

    if (!isValidOTP) {
      // Increment attempt count
      await prisma.oTPCode.update({
        where: { id: otpRecord.id },
        data: { attemptsCount: otpRecord.attemptsCount + 1 },
      });

      throw new AppError('Invalid OTP', 400);
    }

    // Mark OTP as used
    await prisma.oTPCode.update({
      where: { id: otpRecord.id },
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