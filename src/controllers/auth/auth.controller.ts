import { Request, Response } from 'express';
import { EnhancedAuthService } from '../../services/auth/enhanced-auth.service';
import { ResponseHandler } from '../../utils/response';
import { ValidationUtil } from '../../utils/validation';
import { AuthRequest } from '../../types';
import { asyncHandler } from '../../middleware/error-handling';

export class AuthController {
  static register = asyncHandler(async (req: Request, res: Response) => {
    // Debug logging for production environment
    console.log('Request body received:', JSON.stringify(req.body, null, 2));
    console.log('Content-Type:', req.headers['content-type']);
    
    const { phone, email, firstName, lastName } = req.body;

    // Validate input
    const errors = [];
    
    const phoneError = ValidationUtil.validatePhone(phone);
    if (phoneError) errors.push(phoneError);
    
    const emailError = ValidationUtil.validateEmail(email);
    if (emailError) errors.push(emailError);

    const requiredErrors = ValidationUtil.validateRequired({
      firstName,
      lastName,
    });
    errors.push(...requiredErrors);

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    // First step: Just request OTP for registration (send to both phone and email)
    const result = await EnhancedAuthService.requestOTP(
      ValidationUtil.sanitizePhone(phone),
      'registration',
      'both',
      { phone: ValidationUtil.sanitizePhone(phone), email: email.toLowerCase().trim() }
    );

    // Store the registration data in session/temporary storage (you might want to use Redis for production)
    // For now, we'll return success and expect frontend to call verify endpoint
    return ResponseHandler.success(res, {
      ...result,
      message: 'Registration initiated. Please verify OTP to complete registration.',
      phone: ValidationUtil.sanitizePhone(phone),
      email: email.toLowerCase().trim(),
      firstName: ValidationUtil.sanitizeString(firstName),
      lastName: ValidationUtil.sanitizeString(lastName),
    }, 'OTP sent for registration');
  });

  static completeRegistration = asyncHandler(async (req: Request, res: Response) => {
    const { phone, email, firstName, lastName, otpCode } = req.body;

    // Validate input
    const errors = [];
    
    const phoneError = ValidationUtil.validatePhone(phone);
    if (phoneError) errors.push(phoneError);
    
    const emailError = ValidationUtil.validateEmail(email);
    if (emailError) errors.push(emailError);
    
    const otpError = ValidationUtil.validateOTP(otpCode);
    if (otpError) errors.push(otpError);

    const requiredErrors = ValidationUtil.validateRequired({
      firstName,
      lastName,
    });
    errors.push(...requiredErrors);

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const result = await EnhancedAuthService.completeRegistration({
      phone: ValidationUtil.sanitizePhone(phone),
      email: email.toLowerCase().trim(),
      firstName: ValidationUtil.sanitizeString(firstName),
      lastName: ValidationUtil.sanitizeString(lastName),
      otpCode,
    });

    // Registration successful - redirect to login page would be handled by frontend
    return ResponseHandler.created(res, {
      ...result,
      redirectTo: '/login'
    }, 'Registration completed successfully');
  });

  static requestLoginOTP = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, deliveryMethod } = req.body;
    
    // Debug logging for production environment
    console.log('RequestLoginOTP body received:', JSON.stringify(req.body, null, 2));
    console.log('RequestLoginOTP identifier value:', identifier);
    console.log('RequestLoginOTP identifier type:', typeof identifier);

    if (!identifier || identifier.trim() === '') {
      // Log debug information separately
      console.log('RequestLoginOTP validation failed - debug info:', {
        received: identifier,
        type: typeof identifier,
        body: req.body
      });
      
      return ResponseHandler.validationError(res, [{
        field: 'identifier',
        message: 'Phone number or email is required'
      }]);
    }

    // Validate identifier format (phone or email)
    const isEmail = ValidationUtil.validateEmail(identifier) === null;
    const isPhone = ValidationUtil.validatePhone(identifier) === null;
    
    if (!isEmail && !isPhone) {
      return ResponseHandler.validationError(res, [{
        field: 'identifier',
        message: 'Please provide a valid phone number or email address'
      }]);
    }

    // Validate delivery method if provided
    if (deliveryMethod && !['phone', 'email'].includes(deliveryMethod)) {
      return ResponseHandler.validationError(res, [{
        field: 'deliveryMethod',
        message: 'Delivery method must be "phone" or "email"'
      }]);
    }

    const result = await EnhancedAuthService.requestOTP(
      identifier.trim(),
      'login',
      deliveryMethod
    );

    return ResponseHandler.success(res, result);
  });

  static requestOTP = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, purpose = 'login', deliveryMethod } = req.body;
    
    // Debug logging for production environment
    console.log('RequestOTP body received:', JSON.stringify(req.body, null, 2));
    console.log('RequestOTP identifier value:', identifier);
    console.log('RequestOTP identifier type:', typeof identifier);

    if (!identifier || identifier.trim() === '') {
      // Log debug information separately
      console.log('RequestOTP validation failed - debug info:', {
        received: identifier,
        type: typeof identifier,
        body: req.body
      });
      
      return ResponseHandler.validationError(res, [{
        field: 'identifier',
        message: 'Phone number or email is required'
      }]);
    }

    const validPurposes = ['login', 'registration', 'phone_verification', 'email_verification', 'password_reset'];
    if (!validPurposes.includes(purpose)) {
      return ResponseHandler.validationError(res, [{
        field: 'purpose',
        message: 'Invalid purpose',
        value: purpose,
      }]);
    }

    const validDeliveryMethods = ['phone', 'email'];
    if (deliveryMethod && !validDeliveryMethods.includes(deliveryMethod)) {
      return ResponseHandler.validationError(res, [{
        field: 'deliveryMethod',
        message: 'Invalid delivery method. Must be phone or email',
        value: deliveryMethod,
      }]);
    }

    const result = await EnhancedAuthService.requestOTP(
      identifier.trim(),
      purpose,
      deliveryMethod
    );

    return ResponseHandler.success(res, result);
  });

  static verifyLoginOTP = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, otpCode } = req.body;

    const errors = [];
    
    if (!identifier || identifier.trim() === '') {
      errors.push({
        field: 'identifier',
        message: 'Phone number or email is required',
      });
    } else {
      // Validate identifier format (phone or email)
      const isEmail = ValidationUtil.validateEmail(identifier) === null;
      const isPhone = ValidationUtil.validatePhone(identifier) === null;
      
      if (!isEmail && !isPhone) {
        errors.push({
          field: 'identifier',
          message: 'Please provide a valid phone number or email address'
        });
      }
    }
    
    const otpError = ValidationUtil.validateOTP(otpCode);
    if (otpError) errors.push(otpError);

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const result = await EnhancedAuthService.verifyOTPAndLogin(
      identifier.trim(),
      otpCode
    );

    // Login successful - redirect to home page would be handled by frontend
    return ResponseHandler.success(res, {
      ...result,
      redirectTo: '/home'
    }, 'Login successful');
  });

  static verifyOTP = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, otpCode } = req.body;

    const errors = [];
    
    if (!identifier) {
      errors.push({
        field: 'identifier',
        message: 'Phone number or email is required',
      });
    }
    
    const otpError = ValidationUtil.validateOTP(otpCode);
    if (otpError) errors.push(otpError);

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const result = await EnhancedAuthService.verifyOTPAndLogin(
      identifier.trim(),
      otpCode
    );

    return ResponseHandler.success(res, result, 'Login successful');
  });

  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ResponseHandler.validationError(res, [{
        field: 'refreshToken',
        message: 'Refresh token is required',
      }]);
    }

    const result = await EnhancedAuthService.refreshToken(refreshToken);
    return ResponseHandler.success(res, result);
  });

  static logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { refreshToken } = req.body;
    const userId = req.user!.id;

    if (!refreshToken) {
      return ResponseHandler.validationError(res, [{
        field: 'refreshToken',
        message: 'Refresh token is required',
      }]);
    }

    await EnhancedAuthService.logout(userId, refreshToken);
    return ResponseHandler.noContent(res);
  });

  static logoutAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    await EnhancedAuthService.logoutAllSessions(userId);
    return ResponseHandler.noContent(res);
  });

  static getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    
    // Get user profile with related data
    const user = await EnhancedAuthService.getUserProfile(userId);
    return ResponseHandler.success(res, user);
  });

  // OAuth Methods
  static googleLogin = asyncHandler(async (req: Request, res: Response) => {
    const { idToken } = req.body;

    if (!idToken) {
      return ResponseHandler.validationError(res, [{
        field: 'idToken',
        message: 'Google ID token is required',
      }]);
    }

    const result = await EnhancedAuthService.googleLogin(idToken);
    return ResponseHandler.success(res, result, 'Google login successful');
  });

  static appleLogin = asyncHandler(async (req: Request, res: Response) => {
    const { idToken } = req.body;

    if (!idToken) {
      return ResponseHandler.validationError(res, [{
        field: 'idToken',
        message: 'Apple ID token is required',
      }]);
    }

    const result = await EnhancedAuthService.appleLogin(idToken);
    return ResponseHandler.success(res, result, 'Apple login successful');
  });
}