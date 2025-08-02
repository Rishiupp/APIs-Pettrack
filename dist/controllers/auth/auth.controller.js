"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../../services/auth/auth.service");
const response_1 = require("../../utils/response");
const validation_1 = require("../../utils/validation");
const error_handling_1 = require("../../middleware/error-handling");
class AuthController {
}
exports.AuthController = AuthController;
_a = AuthController;
AuthController.register = (0, error_handling_1.asyncHandler)(async (req, res) => {
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
    const { phone, purpose = 'login' } = req.body;
    const phoneError = validation_1.ValidationUtil.validatePhone(phone);
    if (phoneError) {
        return response_1.ResponseHandler.validationError(res, [phoneError]);
    }
    const validPurposes = ['login', 'registration', 'phone_verification', 'password_reset'];
    if (!validPurposes.includes(purpose)) {
        return response_1.ResponseHandler.validationError(res, [{
                field: 'purpose',
                message: 'Invalid purpose',
                value: purpose,
            }]);
    }
    const result = await auth_service_1.AuthService.requestOTP(validation_1.ValidationUtil.sanitizePhone(phone), purpose);
    return response_1.ResponseHandler.success(res, result);
});
AuthController.verifyOTP = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { phone, otpCode } = req.body;
    const errors = [];
    const phoneError = validation_1.ValidationUtil.validatePhone(phone);
    if (phoneError)
        errors.push(phoneError);
    const otpError = validation_1.ValidationUtil.validateOTP(otpCode);
    if (otpError)
        errors.push(otpError);
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const result = await auth_service_1.AuthService.verifyOTPAndLogin(validation_1.ValidationUtil.sanitizePhone(phone), otpCode);
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
    const result = await auth_service_1.AuthService.refreshToken(refreshToken);
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
    await auth_service_1.AuthService.logout(userId, refreshToken);
    return response_1.ResponseHandler.noContent(res);
});
AuthController.logoutAll = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    await auth_service_1.AuthService.logoutAllSessions(userId);
    return response_1.ResponseHandler.noContent(res);
});
AuthController.getProfile = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const user = await auth_service_1.AuthService.getUserProfile(userId);
    return response_1.ResponseHandler.success(res, user);
});
//# sourceMappingURL=auth.controller.js.map