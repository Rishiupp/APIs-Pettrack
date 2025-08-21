import { Request, Response } from 'express';
import { NewRazorpayService } from '../../services/payments/new-razorpay.service';
import { ResponseHandler } from '../../utils/response';
import { ValidationUtil } from '../../utils/validation';
import { AuthRequest } from '../../types';
import { asyncHandler } from '../../middleware/error-handling';

export class NewPaymentsController {
  /**
   * POST /create-order
   * Create an Order in Razorpay then persist a local order record
   */
  static createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { amount_in_paise, currency = 'INR', receipt, metadata, callback_url } = req.body;
    const user_id = req.user!.id;

    // Validate required fields
    const errors = ValidationUtil.validateRequired({
      amount_in_paise,
    });

    // Validate amount
    if (!amount_in_paise || typeof amount_in_paise !== 'number' || amount_in_paise <= 0) {
      errors.push({
        field: 'amount_in_paise',
        message: 'Amount in paise must be a positive number',
        value: amount_in_paise,
      });
    }

    // Validate currency
    if (currency && typeof currency !== 'string') {
      errors.push({
        field: 'currency',
        message: 'Currency must be a string',
        value: currency,
      });
    }

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    try {
      const order = await NewRazorpayService.createOrder({
        amount_in_paise,
        currency,
        user_id,
        receipt,
        metadata,
        callback_url,
      });

      return ResponseHandler.created(res, order, 'Order created successfully');
    } catch (error: any) {
      return ResponseHandler.error(res, error.message, 400);
    }
  });

  /**
   * POST /verify-payment
   * Verify the client-provided checkout result with server-side signature verification
   */
  static verifyPayment = asyncHandler(async (req: Request, res: Response) => {
    const { 
      local_order_id, 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      client_meta 
    } = req.body;

    // Validate required fields
    const errors = ValidationUtil.validateRequired({
      local_order_id,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    });

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    try {
      const result = await NewRazorpayService.verifyPayment({
        local_order_id,
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        client_meta,
      });

      return ResponseHandler.success(res, result, 'Payment verified successfully');
    } catch (error: any) {
      return ResponseHandler.error(res, error.message, 400);
    }
  });

  /**
   * POST /razorpay-webhook  
   * Handle webhook events from Razorpay with idempotency
   * This endpoint requires special handling for raw body to verify signature
   */
  static handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.get('X-Razorpay-Signature');
    
    if (!signature) {
      return ResponseHandler.error(res, 'Missing X-Razorpay-Signature header', 400);
    }

    // For webhook signature verification, we need the raw body
    // In production, you should configure middleware to capture raw body for this route
    let rawBody: string;
    
    // Check if raw body is available (should be set by middleware)
    if ((req as any).rawBody) {
      rawBody = (req as any).rawBody;
    } else {
      // Fallback: re-stringify the parsed body (less secure)
      rawBody = JSON.stringify(req.body);
      console.warn('Using parsed body for webhook verification. Consider adding raw body middleware for better security.');
    }

    const headers = req.headers;

    try {
      const result = await NewRazorpayService.handleWebhook(rawBody, signature, headers);
      return ResponseHandler.success(res, result);
    } catch (error: any) {
      // Log webhook failures for monitoring
      console.error('Webhook processing failed:', {
        error: error.message,
        signature,
        body: req.body,
        timestamp: new Date().toISOString(),
      });
      
      return ResponseHandler.error(res, error.message, 400);
    }
  });
}