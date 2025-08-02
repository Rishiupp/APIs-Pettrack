"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QRController = void 0;
const qr_service_1 = require("../../services/qr/qr.service");
const response_1 = require("../../utils/response");
const validation_1 = require("../../utils/validation");
const error_handling_1 = require("../../middleware/error-handling");
const database_1 = __importDefault(require("../../config/database"));
class QRController {
}
exports.QRController = QRController;
_a = QRController;
QRController.getAvailableQRCodes = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit);
    if (limitNum < 1 || limitNum > 100) {
        return response_1.ResponseHandler.validationError(res, [{
                field: 'limit',
                message: 'Limit must be between 1 and 100',
                value: limitNum,
            }]);
    }
    const qrCodes = await qr_service_1.QRService.getAvailableQRCodes(limitNum);
    return response_1.ResponseHandler.success(res, qrCodes);
});
QRController.assignQRToPet = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { petId } = req.params;
    const { qrId, paymentEventId } = req.body;
    const userId = req.user.id;
    const errors = validation_1.ValidationUtil.validateRequired({
        qrId,
    });
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    if (paymentEventId) {
        const paymentEvent = await database_1.default.paymentEvent.findUnique({
            where: {
                id: paymentEventId,
                userId,
                petId,
                paymentPurpose: 'qr_registration',
                status: 'success',
            },
        });
        if (!paymentEvent) {
            return response_1.ResponseHandler.error(res, 'Valid payment required for QR assignment', 400);
        }
    }
    if (!petId) {
        return response_1.ResponseHandler.error(res, 'Pet ID is required', 400);
    }
    const result = await qr_service_1.QRService.assignQRCodeToPet(qrId, petId, userId);
    return response_1.ResponseHandler.success(res, result, 'QR code assigned successfully');
});
QRController.scanQRCode = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { qrCodeString } = req.params;
    const scanData = req.body;
    if (scanData.location) {
        const coordErrors = validation_1.ValidationUtil.validateCoordinates(scanData.location.latitude, scanData.location.longitude);
        if (coordErrors.length > 0) {
            return response_1.ResponseHandler.validationError(res, coordErrors);
        }
    }
    if (!qrCodeString) {
        return response_1.ResponseHandler.error(res, 'QR code string is required', 400);
    }
    const result = await qr_service_1.QRService.scanQRCode(qrCodeString, scanData, req);
    return response_1.ResponseHandler.success(res, result);
});
QRController.getPetQRCodes = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { petId } = req.params;
    const userId = req.user.id;
    if (!petId) {
        return response_1.ResponseHandler.error(res, 'Pet ID is required', 400);
    }
    const qrCodes = await qr_service_1.QRService.getPetQRCodes(petId, userId);
    return response_1.ResponseHandler.success(res, qrCodes);
});
QRController.getPetScanHistory = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { petId } = req.params;
    const { page, limit } = req.query;
    const userId = req.user.id;
    const { page: validPage, limit: validLimit, errors } = validation_1.ValidationUtil.validatePagination(page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    if (!petId) {
        return response_1.ResponseHandler.error(res, 'Pet ID is required', 400);
    }
    const result = await qr_service_1.QRService.getPetScanHistory(petId, userId, validPage, validLimit);
    return response_1.ResponseHandler.success(res, result.scans, undefined, 200, result.meta);
});
QRController.activateQRCode = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { qrId } = req.params;
    const user = req.user;
    if (user.role === 'pet_owner') {
        return response_1.ResponseHandler.forbidden(res, 'Not authorized to activate QR codes');
    }
    if (!qrId) {
        return response_1.ResponseHandler.error(res, 'QR ID is required', 400);
    }
    const result = await qr_service_1.QRService.activateQRCode(qrId);
    return response_1.ResponseHandler.success(res, result, 'QR code activated successfully');
});
//# sourceMappingURL=qr.controller.js.map