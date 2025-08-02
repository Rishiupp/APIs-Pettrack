"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const razorpay_service_1 = require("../../services/payments/razorpay.service");
const response_1 = require("../../utils/response");
const validation_1 = require("../../utils/validation");
const error_handling_1 = require("../../middleware/error-handling");
const database_1 = __importDefault(require("../../config/database"));
class PaymentsController {
}
exports.PaymentsController = PaymentsController;
_a = PaymentsController;
PaymentsController.createOrder = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { petId, amount, currency = 'INR', purpose } = req.body;
    const errors = validation_1.ValidationUtil.validateRequired({
        amount,
        purpose,
    });
    if (purpose === 'qr_registration' && !petId) {
        errors.push({
            field: 'petId',
            message: 'Pet ID is required for QR registration',
        });
    }
    if (!validation_1.ValidationUtil.isValidAmount(amount)) {
        errors.push({
            field: 'amount',
            message: 'Invalid amount',
            value: amount,
        });
    }
    const validPurposes = ['qr_registration', 'premium_features', 'vet_consultation'];
    if (!validPurposes.includes(purpose)) {
        errors.push({
            field: 'purpose',
            message: 'Invalid payment purpose',
            value: purpose,
        });
    }
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const order = await razorpay_service_1.RazorpayService.createPaymentOrder(userId, {
        petId,
        amount,
        currency,
        purpose,
    });
    return response_1.ResponseHandler.created(res, order, 'Payment order created successfully');
});
PaymentsController.verifyPayment = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { paymentEventId } = req.params;
    const { razorpayPaymentId, razorpaySignature } = req.body;
    if (!paymentEventId) {
        return response_1.ResponseHandler.error(res, 'Payment event ID is required', 400);
    }
    const errors = validation_1.ValidationUtil.validateRequired({
        razorpayPaymentId,
        razorpaySignature,
    });
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const result = await razorpay_service_1.RazorpayService.verifyPayment(paymentEventId, {
        razorpayPaymentId,
        razorpaySignature,
    });
    return response_1.ResponseHandler.success(res, result, 'Payment verified successfully');
});
PaymentsController.handleWebhook = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const signature = req.get('X-Razorpay-Signature');
    const payload = req.body;
    if (!signature) {
        return response_1.ResponseHandler.error(res, 'Missing webhook signature', 400);
    }
    await razorpay_service_1.RazorpayService.handleWebhook(payload, signature);
    return response_1.ResponseHandler.success(res, { message: 'Webhook processed successfully' });
});
PaymentsController.getPaymentHistory = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { page, limit } = req.query;
    const { page: validPage, limit: validLimit, errors } = validation_1.ValidationUtil.validatePagination(page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const result = await razorpay_service_1.RazorpayService.getPaymentHistory(userId, validPage, validLimit);
    return response_1.ResponseHandler.success(res, result.payments, undefined, 200, result.meta);
});
PaymentsController.initiateRefund = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { paymentEventId } = req.params;
    const { refundAmount, reason } = req.body;
    const userId = req.user.id;
    const errors = validation_1.ValidationUtil.validateRequired({
        refundAmount,
        reason,
    });
    if (!validation_1.ValidationUtil.isValidAmount(refundAmount)) {
        errors.push({
            field: 'refundAmount',
            message: 'Invalid refund amount',
            value: refundAmount,
        });
    }
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const user = await database_1.default.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    if (!user || user.role !== 'admin') {
        return response_1.ResponseHandler.forbidden(res, 'Only administrators can initiate refunds');
    }
    if (!paymentEventId) {
        return response_1.ResponseHandler.error(res, 'Payment event ID is required', 400);
    }
    const refund = await razorpay_service_1.RazorpayService.initiateRefund(paymentEventId, refundAmount, reason, userId);
    return response_1.ResponseHandler.created(res, refund, 'Refund initiated successfully');
});
//# sourceMappingURL=payments.controller.js.map