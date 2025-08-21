import { Router } from 'express';
import { NewPaymentsController } from '../../controllers/payments/new-payments.controller';
import { authenticate } from '../../middleware/auth/authenticate';

const router = Router();

/**
 * POST /create-order
 * Create an Order in Razorpay then persist a local order record
 * Requires authentication
 */
router.post('/create-order', authenticate, NewPaymentsController.createOrder);

/**
 * POST /verify-payment  
 * Verify the client-provided checkout result with server-side signature verification
 * No authentication required - uses order ID for security
 */
router.post('/verify-payment', NewPaymentsController.verifyPayment);

/**
 * POST /razorpay-webhook
 * Handle webhook events from Razorpay with idempotency and signature verification
 * No authentication required - uses webhook signature for security
 */
router.post('/razorpay-webhook', NewPaymentsController.handleWebhook);

export default router;