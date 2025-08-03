"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutiveController = void 0;
const executive_service_1 = require("../../services/executive/executive.service");
const response_1 = require("../../utils/response");
const validation_1 = require("../../utils/validation");
const error_handling_1 = require("../../middleware/error-handling");
class ExecutiveController {
}
exports.ExecutiveController = ExecutiveController;
_a = ExecutiveController;
ExecutiveController.registerPet = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const executiveId = req.user.id;
    const registrationData = req.body;
    const ownerErrors = [];
    const requiredOwnerFields = ['firstName', 'lastName', 'phone', 'email'];
    for (const field of requiredOwnerFields) {
        if (!registrationData.ownerDetails?.[field]) {
            ownerErrors.push({
                field: `ownerDetails.${field}`,
                message: `${field} is required`,
            });
        }
    }
    if (registrationData.ownerDetails?.email) {
        const emailError = validation_1.ValidationUtil.validateEmail(registrationData.ownerDetails.email);
        if (emailError)
            ownerErrors.push(emailError);
    }
    if (registrationData.ownerDetails?.phone) {
        const phoneError = validation_1.ValidationUtil.validatePhone(registrationData.ownerDetails.phone);
        if (phoneError)
            ownerErrors.push(phoneError);
    }
    const petErrors = validation_1.ValidationUtil.validateRequired({
        name: registrationData.petDetails?.name,
        gender: registrationData.petDetails?.gender,
    });
    const paymentErrors = [];
    if (registrationData.paymentMethod) {
        const validPaymentMethods = ['cash', 'online'];
        if (!validPaymentMethods.includes(registrationData.paymentMethod)) {
            paymentErrors.push({
                field: 'paymentMethod',
                message: 'Invalid payment method',
                value: registrationData.paymentMethod,
            });
        }
        if (!registrationData.amount || !validation_1.ValidationUtil.isValidAmount(registrationData.amount)) {
            paymentErrors.push({
                field: 'amount',
                message: 'Valid amount is required',
                value: registrationData.amount,
            });
        }
    }
    const allErrors = [...ownerErrors, ...petErrors, ...paymentErrors];
    if (allErrors.length > 0) {
        return response_1.ResponseHandler.validationError(res, allErrors);
    }
    const result = await executive_service_1.ExecutiveService.registerPetWithOwner(executiveId, registrationData);
    return response_1.ResponseHandler.created(res, result, 'Pet registered successfully');
});
ExecutiveController.getRegistrationHistory = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const executiveId = req.user.id;
    const { page, limit, from } = req.query;
    const { page: validPage, limit: validLimit, errors } = validation_1.ValidationUtil.validatePagination(page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    if (from && isNaN(Date.parse(from))) {
        return response_1.ResponseHandler.validationError(res, [{
                field: 'from',
                message: 'Invalid date format',
                value: from,
            }]);
    }
    const result = await executive_service_1.ExecutiveService.getRegistrationHistory(executiveId, validPage, validLimit, from);
    return response_1.ResponseHandler.success(res, result.registrations, undefined, 200, result.meta);
});
ExecutiveController.getExecutiveStats = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const executiveId = req.user.id;
    const stats = await executive_service_1.ExecutiveService.getExecutiveStats(executiveId);
    return response_1.ResponseHandler.success(res, stats);
});
ExecutiveController.getProfile = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const executiveId = req.user.id;
    const profile = await executive_service_1.ExecutiveService.getExecutiveProfile(executiveId);
    return response_1.ResponseHandler.success(res, profile);
});
ExecutiveController.updateProfile = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const executiveId = req.user.id;
    const { territory } = req.body;
    const updateData = {};
    if (territory) {
        updateData.territory = validation_1.ValidationUtil.sanitizeString(territory);
    }
    const profile = await executive_service_1.ExecutiveService.updateExecutiveProfile(executiveId, updateData);
    return response_1.ResponseHandler.success(res, profile, 'Profile updated successfully');
});
ExecutiveController.getDailyReport = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const executiveId = req.user.id;
    const { date } = req.query;
    if (!date) {
        return response_1.ResponseHandler.validationError(res, [{
                field: 'date',
                message: 'Date is required (YYYY-MM-DD format)',
            }]);
    }
    if (isNaN(Date.parse(date))) {
        return response_1.ResponseHandler.validationError(res, [{
                field: 'date',
                message: 'Invalid date format (YYYY-MM-DD expected)',
                value: date,
            }]);
    }
    const report = await executive_service_1.ExecutiveService.getDailyRegistrationReport(executiveId, date);
    return response_1.ResponseHandler.success(res, report);
});
ExecutiveController.getAllExecutives = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { page, limit } = req.query;
    const { page: validPage, limit: validLimit, errors } = validation_1.ValidationUtil.validatePagination(page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const result = await executive_service_1.ExecutiveService.getAllExecutives(validPage, validLimit);
    return response_1.ResponseHandler.success(res, result.executives, undefined, 200, result.meta);
});
ExecutiveController.createExecutive = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { email, phone, firstName, lastName, employeeId, territory } = req.body;
    const errors = validation_1.ValidationUtil.validateRequired({
        email,
        phone,
        firstName,
        lastName,
        employeeId,
    });
    const emailError = validation_1.ValidationUtil.validateEmail(email);
    if (emailError)
        errors.push(emailError);
    const phoneError = validation_1.ValidationUtil.validatePhone(phone);
    if (phoneError)
        errors.push(phoneError);
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const result = await executive_service_1.ExecutiveService.createExecutive({
        email: email.toLowerCase().trim(),
        phone: validation_1.ValidationUtil.sanitizePhone(phone),
        firstName: validation_1.ValidationUtil.sanitizeString(firstName),
        lastName: validation_1.ValidationUtil.sanitizeString(lastName),
        employeeId: validation_1.ValidationUtil.sanitizeString(employeeId),
        territory: territory ? validation_1.ValidationUtil.sanitizeString(territory) : undefined,
    });
    return response_1.ResponseHandler.created(res, result, 'Executive created successfully');
});
ExecutiveController.deactivateExecutive = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { executiveId } = req.params;
    if (!executiveId) {
        return response_1.ResponseHandler.error(res, 'Executive ID is required', 400);
    }
    const result = await executive_service_1.ExecutiveService.deactivateExecutive(executiveId);
    return response_1.ResponseHandler.success(res, result, 'Executive deactivated successfully');
});
//# sourceMappingURL=executive.controller.js.map