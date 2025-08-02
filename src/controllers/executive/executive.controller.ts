import { Request, Response } from 'express';
import { ExecutiveService } from '../../services/executive/executive.service';
import { ResponseHandler } from '../../utils/response';
import { ValidationUtil } from '../../utils/validation';
import { AuthRequest } from '../../types';
import { asyncHandler } from '../../middleware/error-handling';

export class ExecutiveController {
  static registerPet = asyncHandler(async (req: AuthRequest, res: Response) => {
    const executiveId = req.user!.id;
    const registrationData = req.body;

    // Validate owner details
    const ownerErrors: Array<{field: string; message: string; value?: any}> = [];
    const requiredOwnerFields = ['firstName', 'lastName', 'phone', 'email'];
    
    for (const field of requiredOwnerFields) {
      if (!registrationData.ownerDetails?.[field]) {
        ownerErrors.push({
          field: `ownerDetails.${field}`,
          message: `${field} is required`,
        });
      }
    }

    // Validate email and phone
    if (registrationData.ownerDetails?.email) {
      const emailError = ValidationUtil.validateEmail(registrationData.ownerDetails.email);
      if (emailError) ownerErrors.push(emailError);
    }

    if (registrationData.ownerDetails?.phone) {
      const phoneError = ValidationUtil.validatePhone(registrationData.ownerDetails.phone);
      if (phoneError) ownerErrors.push(phoneError);
    }

    // Validate pet details
    const petErrors = ValidationUtil.validateRequired({
      name: registrationData.petDetails?.name,
      gender: registrationData.petDetails?.gender,
    });

    // Validate payment details
    const paymentErrors: Array<{field: string; message: string; value?: any}> = [];
    if (registrationData.paymentMethod) {
      const validPaymentMethods = ['cash', 'online'];
      if (!validPaymentMethods.includes(registrationData.paymentMethod)) {
        paymentErrors.push({
          field: 'paymentMethod',
          message: 'Invalid payment method',
          value: registrationData.paymentMethod,
        });
      }

      if (!registrationData.amount || !ValidationUtil.isValidAmount(registrationData.amount)) {
        paymentErrors.push({
          field: 'amount',
          message: 'Valid amount is required',
          value: registrationData.amount,
        });
      }
    }

    const allErrors = [...ownerErrors, ...petErrors, ...paymentErrors];
    if (allErrors.length > 0) {
      return ResponseHandler.validationError(res, allErrors);
    }

    const result = await ExecutiveService.registerPetWithOwner(executiveId, registrationData);
    return ResponseHandler.created(res, result, 'Pet registered successfully');
  });

  static getRegistrationHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const executiveId = req.user!.id;
    const { page, limit, from } = req.query;

    const { page: validPage, limit: validLimit, errors } = ValidationUtil.validatePagination(
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    // Validate from date if provided
    if (from && isNaN(Date.parse(from as string))) {
      return ResponseHandler.validationError(res, [{
        field: 'from',
        message: 'Invalid date format',
        value: from,
      }]);
    }

    const result = await ExecutiveService.getRegistrationHistory(
      executiveId,
      validPage,
      validLimit,
      from as string
    );

    return ResponseHandler.success(res, result.registrations, undefined, 200, result.meta);
  });

  static getExecutiveStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const executiveId = req.user!.id;

    const stats = await ExecutiveService.getExecutiveStats(executiveId);
    return ResponseHandler.success(res, stats);
  });

  static getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const executiveId = req.user!.id;

    const profile = await ExecutiveService.getExecutiveProfile(executiveId);
    return ResponseHandler.success(res, profile);
  });

  static updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const executiveId = req.user!.id;
    const { territory } = req.body;

    const updateData: any = {};
    if (territory) {
      updateData.territory = ValidationUtil.sanitizeString(territory);
    }

    const profile = await ExecutiveService.updateExecutiveProfile(executiveId, updateData);
    return ResponseHandler.success(res, profile, 'Profile updated successfully');
  });

  static getDailyReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const executiveId = req.user!.id;
    const { date } = req.query;

    if (!date) {
      return ResponseHandler.validationError(res, [{
        field: 'date',
        message: 'Date is required (YYYY-MM-DD format)',
      }]);
    }

    if (isNaN(Date.parse(date as string))) {
      return ResponseHandler.validationError(res, [{
        field: 'date',
        message: 'Invalid date format (YYYY-MM-DD expected)',
        value: date,
      }]);
    }

    const report = await ExecutiveService.getDailyRegistrationReport(executiveId, date as string);
    return ResponseHandler.success(res, report);
  });

  // Admin methods for executive management
  static getAllExecutives = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = req.query;

    const { page: validPage, limit: validLimit, errors } = ValidationUtil.validatePagination(
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const result = await ExecutiveService.getAllExecutives(validPage, validLimit);
    return ResponseHandler.success(res, result.executives, undefined, 200, result.meta);
  });

  static createExecutive = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, phone, firstName, lastName, employeeId, territory } = req.body;

    // Validate input
    const errors = ValidationUtil.validateRequired({
      email,
      phone,
      firstName,
      lastName,
      employeeId,
    });

    const emailError = ValidationUtil.validateEmail(email);
    if (emailError) errors.push(emailError);

    const phoneError = ValidationUtil.validatePhone(phone);
    if (phoneError) errors.push(phoneError);

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const result = await ExecutiveService.createExecutive({
      email: email.toLowerCase().trim(),
      phone: ValidationUtil.sanitizePhone(phone),
      firstName: ValidationUtil.sanitizeString(firstName),
      lastName: ValidationUtil.sanitizeString(lastName),
      employeeId: ValidationUtil.sanitizeString(employeeId),
      territory: territory ? ValidationUtil.sanitizeString(territory) : undefined,
    });

    return ResponseHandler.created(res, result, 'Executive created successfully');
  });

  static deactivateExecutive = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { executiveId } = req.params;

    if (!executiveId) {
      return ResponseHandler.error(res, 'Executive ID is required', 400);
    }

    const result = await ExecutiveService.deactivateExecutive(executiveId);
    return ResponseHandler.success(res, result, 'Executive deactivated successfully');
  });
}