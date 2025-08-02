import { Request, Response } from 'express';
import { RazorpayService } from '../../services/payments/razorpay.service';
import { ResponseHandler } from '../../utils/response';
import { ValidationUtil } from '../../utils/validation';
import { AuthRequest } from '../../types';
import { asyncHandler } from '../../middleware/error-handling';
import prisma from '../../config/database';

export class PaymentsController {
  static createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { petId, amount, currency = 'INR', purpose } = req.body;

    // Validate input
    const errors = ValidationUtil.validateRequired({
      amount,
      purpose,
    });

    if (purpose === 'qr_registration' && !petId) {
      errors.push({
        field: 'petId',
        message: 'Pet ID is required for QR registration',
      });
    }

    if (!ValidationUtil.isValidAmount(amount)) {
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
      return ResponseHandler.validationError(res, errors);
    }

    const order = await RazorpayService.createPaymentOrder(userId, {
      petId,
      amount,
      currency,
      purpose,
    });

    return ResponseHandler.created(res, order, 'Payment order created successfully');
  });

  static verifyPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { paymentEventId } = req.params;
    const { razorpayPaymentId, razorpaySignature } = req.body;

    if (!paymentEventId) {
      return ResponseHandler.error(res, 'Payment event ID is required', 400);
    }

    // Validate input
    const errors = ValidationUtil.validateRequired({
      razorpayPaymentId,
      razorpaySignature,
    });

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const result = await RazorpayService.verifyPayment(paymentEventId, {
      razorpayPaymentId,
      razorpaySignature,
    });

    return ResponseHandler.success(res, result, 'Payment verified successfully');
  });

  static handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.get('X-Razorpay-Signature');
    const payload = req.body;

    if (!signature) {
      return ResponseHandler.error(res, 'Missing webhook signature', 400);
    }

    await RazorpayService.handleWebhook(payload, signature);
    return ResponseHandler.success(res, { message: 'Webhook processed successfully' });
  });

  static getPaymentHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { page, limit } = req.query;

    const { page: validPage, limit: validLimit, errors } = ValidationUtil.validatePagination(
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const result = await RazorpayService.getPaymentHistory(userId, validPage, validLimit);
    return ResponseHandler.success(res, result.payments, undefined, 200, result.meta);
  });

  static initiateRefund = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { paymentEventId } = req.params;
    const { refundAmount, reason } = req.body;
    const userId = req.user!.id;

    // Validate input
    const errors = ValidationUtil.validateRequired({
      refundAmount,
      reason,
    });

    if (!ValidationUtil.isValidAmount(refundAmount)) {
      errors.push({
        field: 'refundAmount',
        message: 'Invalid refund amount',
        value: refundAmount,
      });
    }

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    // Check if user is admin (only admins can initiate refunds)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'admin') {
      return ResponseHandler.forbidden(res, 'Only administrators can initiate refunds');
    }

    if (!paymentEventId) {
      return ResponseHandler.error(res, 'Payment event ID is required', 400);
    }

    const refund = await RazorpayService.initiateRefund(
      paymentEventId,
      refundAmount,
      reason,
      userId
    );

    return ResponseHandler.created(res, refund, 'Refund initiated successfully');
  });
}