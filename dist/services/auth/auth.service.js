"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const crypto_1 = require("../../utils/crypto");
const jwt_1 = require("../../utils/jwt");
const types_1 = require("../../types");
const config_1 = require("../../config");
const sms_service_1 = require("../sms/sms.service");
class AuthService {
    static async requestOTP(phone, purpose) {
        const sanitizedPhone = phone.replace(/\s+/g, '');
        const existingUser = await database_1.default.user.findUnique({
            where: { phone: sanitizedPhone },
        });
        if (purpose === client_1.OTPPurpose.login && !existingUser) {
            throw new types_1.AppError('User not found. Please register first.', 404);
        }
        if (purpose === client_1.OTPPurpose.registration && existingUser) {
            throw new types_1.AppError('User already exists. Please login instead.', 409);
        }
        await database_1.default.oTPCode.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
            },
        });
        const existingOTP = await database_1.default.oTPCode.findFirst({
            where: {
                userId: existingUser?.id,
                purpose,
                isUsed: false,
                expiresAt: { gt: new Date() },
            },
        });
        if (existingOTP) {
            const timeRemaining = Math.ceil((existingOTP.expiresAt.getTime() - Date.now()) / 1000);
            throw new types_1.AppError(`OTP already sent. Please wait ${timeRemaining} seconds.`, 429);
        }
        const otpCode = crypto_1.CryptoUtil.generateOTP();
        const otpHash = crypto_1.CryptoUtil.hashOTP(otpCode);
        const expiresAt = new Date(Date.now() + config_1.config.otp.expiryTime * 1000);
        let userId;
        if (existingUser) {
            userId = existingUser.id;
        }
        else {
            if (purpose === 'registration') {
                throw new types_1.AppError('Please use the complete registration endpoint with user details', 400);
            }
            throw new types_1.AppError('User not found', 404);
        }
        await database_1.default.oTPCode.create({
            data: {
                userId,
                codeHash: otpHash,
                purpose,
                expiresAt,
            },
        });
        try {
            await sms_service_1.SMSService.sendOTP(sanitizedPhone, otpCode);
        }
        catch (error) {
            console.error('Failed to send OTP SMS:', error);
            console.log(`OTP for ${sanitizedPhone}: ${otpCode}`);
        }
        return {
            message: 'OTP sent successfully',
            expiresIn: config_1.config.otp.expiryTime,
        };
    }
    static async verifyOTPAndLogin(phone, code) {
        const sanitizedPhone = phone.replace(/\s+/g, '');
        const otpHash = crypto_1.CryptoUtil.hashOTP(code);
        const user = await database_1.default.user.findUnique({
            where: { phone: sanitizedPhone },
            include: {
                otpCodes: {
                    where: {
                        codeHash: otpHash,
                        purpose: client_1.OTPPurpose.login,
                        isUsed: false,
                        expiresAt: { gt: new Date() },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });
        if (!user || user.otpCodes.length === 0) {
            throw new types_1.AppError('Invalid or expired OTP', 401);
        }
        const otpRecord = user.otpCodes[0];
        if (!otpRecord) {
            throw new types_1.AppError('Invalid or expired OTP', 401);
        }
        if (otpRecord.attemptsCount >= otpRecord.maxAttempts) {
            throw new types_1.AppError('Maximum OTP attempts exceeded', 429);
        }
        await database_1.default.oTPCode.update({
            where: { id: otpRecord.id },
            data: { isUsed: true },
        });
        await database_1.default.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });
        const permissions = (0, jwt_1.getRolePermissions)(user.role);
        const accessToken = jwt_1.JWTUtil.generateAccessToken(user.id, user.role, permissions);
        const refreshToken = jwt_1.JWTUtil.generateRefreshToken(user.id);
        const refreshTokenHash = crypto_1.CryptoUtil.hashOTP(refreshToken);
        await database_1.default.userSession.create({
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
    }
    static async register(userData) {
        const { phone, email, firstName, lastName, otpCode } = userData;
        const sanitizedPhone = phone.replace(/\s+/g, '');
        const existingActiveUser = await database_1.default.user.findFirst({
            where: {
                OR: [
                    { phone: sanitizedPhone },
                    { email: email.toLowerCase() },
                ],
                isActive: true,
            },
        });
        if (existingActiveUser) {
            throw new types_1.AppError('User already exists with this phone or email', 409);
        }
        try {
            await database_1.default.user.deleteMany({
                where: {
                    phone: sanitizedPhone,
                    isActive: false,
                    createdAt: {
                        lt: new Date(Date.now() - 10 * 60 * 1000),
                    },
                },
            });
            let user = await database_1.default.user.findFirst({
                where: {
                    phone: sanitizedPhone,
                    isActive: false,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            console.log(`Debug: Looking for temp user with phone: ${sanitizedPhone}`);
            console.log(`Debug: Found temp user:`, user ? { id: user.id, phone: user.phone, isActive: user.isActive } : 'null');
            if (!user) {
                const anyUser = await database_1.default.user.findFirst({
                    where: { phone: sanitizedPhone },
                });
                console.log(`Debug: Any user with this phone:`, anyUser ? { id: anyUser.id, phone: anyUser.phone, isActive: anyUser.isActive } : 'null');
                throw new types_1.AppError('Please request OTP first before registering', 400);
            }
            const otpHash = crypto_1.CryptoUtil.hashOTP(otpCode);
            console.log(`Debug: Verifying OTP for user ${user.id}`);
            console.log(`Debug: Looking for OTP with purpose: registration`);
            const validOTP = await database_1.default.oTPCode.findFirst({
                where: {
                    userId: user.id,
                    codeHash: otpHash,
                    purpose: client_1.OTPPurpose.registration,
                    isUsed: false,
                    expiresAt: { gt: new Date() },
                },
            });
            console.log(`Debug: Found valid OTP:`, validOTP ? { id: validOTP.id, isUsed: validOTP.isUsed, expiresAt: validOTP.expiresAt } : 'null');
            if (!validOTP) {
                const anyOTP = await database_1.default.oTPCode.findFirst({
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
                throw new types_1.AppError('Invalid or expired OTP. Please request a new OTP first.', 400);
            }
            await database_1.default.oTPCode.update({
                where: { id: validOTP.id },
                data: { isUsed: true },
            });
            user = await database_1.default.user.update({
                where: { id: user.id },
                data: {
                    email: email.toLowerCase(),
                    firstName,
                    lastName,
                    phoneVerified: true,
                    isActive: true,
                },
            });
            await database_1.default.petOwner.create({
                data: {
                    userId: user.id,
                },
            });
            const permissions = (0, jwt_1.getRolePermissions)(user.role);
            const accessToken = jwt_1.JWTUtil.generateAccessToken(user.id, user.role, permissions);
            const refreshToken = jwt_1.JWTUtil.generateRefreshToken(user.id);
            const refreshTokenHash = crypto_1.CryptoUtil.hashOTP(refreshToken);
            await database_1.default.userSession.create({
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
        }
        catch (error) {
            throw error;
        }
    }
    static async refreshToken(refreshToken) {
        const decoded = jwt_1.JWTUtil.verifyRefreshToken(refreshToken);
        if (!decoded) {
            throw new types_1.AppError('Invalid refresh token', 401);
        }
        const refreshTokenHash = crypto_1.CryptoUtil.hashOTP(refreshToken);
        const session = await database_1.default.userSession.findFirst({
            where: {
                userId: decoded.sub,
                refreshTokenHash,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
        });
        if (!session || !session.user.isActive) {
            throw new types_1.AppError('Invalid session or user inactive', 401);
        }
        const permissions = (0, jwt_1.getRolePermissions)(session.user.role);
        const newAccessToken = jwt_1.JWTUtil.generateAccessToken(session.user.id, session.user.role, permissions);
        await database_1.default.userSession.update({
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
    static async logout(userId, refreshToken) {
        const refreshTokenHash = crypto_1.CryptoUtil.hashOTP(refreshToken);
        await database_1.default.userSession.deleteMany({
            where: {
                userId,
                refreshTokenHash,
            },
        });
        return { message: 'Logged out successfully' };
    }
    static async logoutAllSessions(userId) {
        await database_1.default.userSession.deleteMany({
            where: { userId },
        });
        return { message: 'Logged out from all devices successfully' };
    }
    static async getUserProfile(userId) {
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
            include: {
                petOwner: true,
                executive: true,
                notificationPrefs: true,
            },
        });
        if (!user) {
            throw new types_1.AppError('User not found', 404);
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
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map