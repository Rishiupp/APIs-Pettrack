"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payments_controller_1 = require("../../controllers/payments/payments.controller");
const authenticate_1 = require("../../middleware/auth/authenticate");
const authorize_1 = require("../../middleware/auth/authorize");
const rate_limiting_1 = require("../../middleware/rate-limiting");
const router = (0, express_1.Router)();
router.post('/create-order', authenticate_1.authenticate, authorize_1.requireAuthenticated, rate_limiting_1.paymentRateLimit, payments_controller_1.PaymentsController.createOrder);
router.post('/:paymentEventId/verify', authenticate_1.authenticate, authorize_1.requireAuthenticated, payments_controller_1.PaymentsController.verifyPayment);
router.post('/webhook/razorpay', payments_controller_1.PaymentsController.handleWebhook);
router.get('/', authenticate_1.authenticate, authorize_1.requireAuthenticated, payments_controller_1.PaymentsController.getPaymentHistory);
router.post('/:paymentEventId/refund', authenticate_1.authenticate, authorize_1.requireAdmin, payments_controller_1.PaymentsController.initiateRefund);
exports.default = router;
//# sourceMappingURL=index.js.map