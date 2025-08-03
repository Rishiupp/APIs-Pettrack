"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../../services/auth/auth.service");
const enhanced_auth_service_1 = require("../../services/auth/enhanced-auth.service");
const response_1 = require("../../utils/response");
const validation_1 = require("../../utils/validation");
const error_handling_1 = require("../../middleware/error-handling");
class AuthController {
}
exports.AuthController = AuthController;
_a = AuthController;
AuthController.register = (0, error_handling_1.asyncHandler)(async (req, res) => {
    console.log('Request body received:', JSON.stringify(req.body, null, 2));
    console.log('Content-Type:', req.headers['content-type']);
    const { phone, email, firstName, lastName, otpCode } = req.body;
    const errors = [];
    const phoneError = validation_1.ValidationUtil.validatePhone(phone);
    if (phoneError)
        errors.push(phoneError);
    const emailError = validation_1.ValidationUtil.validateEmail(email);
    if (emailError)
        errors.push(emailError);
    const otpError = validation_1.ValidationUtil.validateOTP(otpCode);
    if (otpError)
        errors.push(otpError);
    const requiredErrors = validation_1.ValidationUtil.validateRequired({
        firstName,
        lastName,
    });
    errors.push(...requiredErrors);
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const result = await auth_service_1.AuthService.register({
        phone: validation_1.ValidationUtil.sanitizePhone(phone),
        email: email.toLowerCase().trim(),
        firstName: validation_1.ValidationUtil.sanitizeString(firstName),
        lastName: validation_1.ValidationUtil.sanitizeString(lastName),
        otpCode,
    });
    return response_1.ResponseHandler.created(res, result, 'Registration successful');
});
AuthController.requestOTP = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { identifier, purpose = 'login', deliveryMethod } = req.body;
    console.log('RequestOTP body received:', JSON.stringify(req.body, null, 2));
    console.log('RequestOTP identifier value:', identifier);
    console.log('RequestOTP identifier type:', typeof identifier);
    if (!identifier || identifier.trim() === '') {
        console.log('RequestOTP validation failed - debug info:', {
            received: identifier,
            type: typeof identifier,
            body: req.body
        });
        return response_1.ResponseHandler.validationError(res, [{
                field: 'identifier',
                message: 'Phone number or email is required'
            }]);
    }
    const validPurposes = ['login', 'registration', 'phone_verification', 'email_verification', 'password_reset'];
    if (!validPurposes.includes(purpose)) {
        return response_1.ResponseHandler.validationError(res, [{
                field: 'purpose',
                message: 'Invalid purpose',
                value: purpose,
            }]);
    }
    const validDeliveryMethods = ['phone', 'email'];
    if (deliveryMethod && !validDeliveryMethods.includes(deliveryMethod)) {
        return response_1.ResponseHandler.validationError(res, [{
                field: 'deliveryMethod',
                message: 'Invalid delivery method. Must be phone or email',
                value: deliveryMethod,
            }]);
    }
    const result = await enhanced_auth_service_1.EnhancedAuthService.requestOTP(identifier.trim(), purpose, deliveryMethod);
    return response_1.ResponseHandler.success(res, result);
});
AuthController.verifyOTP = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { identifier, otpCode } = req.body;
    const errors = [];
    if (!identifier) {
        errors.push({
            field: 'identifier',
            message: 'Phone number or email is required',
        });
    }
    const otpError = validation_1.ValidationUtil.validateOTP(otpCode);
    if (otpError)
        errors.push(otpError);
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const result = await enhanced_auth_service_1.EnhancedAuthService.verifyOTPAndLogin(identifier.trim(), otpCode);
    return response_1.ResponseHandler.success(res, result, 'Login successful');
});
AuthController.refreshToken = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return response_1.ResponseHandler.validationError(res, [{
                field: 'refreshToken',
                message: 'Refresh token is required',
            }]);
    }
    const result = await enhanced_auth_service_1.EnhancedAuthService.refreshToken(refreshToken);
    return response_1.ResponseHandler.success(res, result);
});
AuthController.logout = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    const userId = req.user.id;
    if (!refreshToken) {
        return response_1.ResponseHandler.validationError(res, [{
                field: 'refreshToken',
                message: 'Refresh token is required',
            }]);
    }
    await enhanced_auth_service_1.EnhancedAuthService.logout(userId, refreshToken);
    return response_1.ResponseHandler.noContent(res);
});
AuthController.logoutAll = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    await enhanced_auth_service_1.EnhancedAuthService.logoutAllSessions(userId);
    return response_1.ResponseHandler.noContent(res);
});
AuthController.getProfile = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const user = await enhanced_auth_service_1.EnhancedAuthService.getUserProfile(userId);
    return response_1.ResponseHandler.success(res, user);
});
AuthController.googleLogin = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
        return response_1.ResponseHandler.validationError(res, [{
                field: 'idToken',
                message: 'Google ID token is required',
            }]);
    }
    const result = await enhanced_auth_service_1.EnhancedAuthService.googleLogin(idToken);
    return response_1.ResponseHandler.success(res, result, 'Google login successful');
});
AuthController.appleLogin = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
        return response_1.ResponseHandler.validationError(res, [{
                field: 'idToken',
                message: 'Apple ID token is required',
            }]);
    }
    const result = await enhanced_auth_service_1.EnhancedAuthService.appleLogin(idToken);
    return response_1.ResponseHandler.success(res, result, 'Apple login successful');
});
//# sourceMappingURL=auth.controller.js.map