import { Router } from 'express';
import { PaymentsController } from '../../controllers/payments/payments.controller';
import { authenticate } from '../../middleware/auth/authenticate';
import { requireAuthenticated, requireAdmin } from '../../middleware/auth/authorize';
import { paymentRateLimit } from '../../middleware/rate-limiting';

const router = Router();

// Get payment configuration (no authentication required for public config)
router.get('/config', PaymentsController.getConfig);

// Create payment order (requires authentication)
router.post('/create-order', authenticate, requireAuthenticated, paymentRateLimit, PaymentsController.createOrder);

// Verify payment (requires authentication)
router.post('/:paymentEventId/verify', authenticate, requireAuthenticated, PaymentsController.verifyPayment);

// Webhook endpoint (no authentication required)
router.post('/webhook/razorpay', PaymentsController.handleWebhook);

// Get payment history (requires authentication)
router.get('/', authenticate, requireAuthenticated, PaymentsController.getPaymentHistory);

// Initiate refund (admin only)
router.post('/:paymentEventId/refund', authenticate, requireAdmin, PaymentsController.initiateRefund);

export default router;