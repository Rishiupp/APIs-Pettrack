"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../../controllers/auth/auth.controller");
const authenticate_1 = require("../../middleware/auth/authenticate");
const rate_limiting_1 = require("../../middleware/rate-limiting");
const router = (0, express_1.Router)();
router.post('/register', rate_limiting_1.strictRateLimit, auth_controller_1.AuthController.register);
router.post('/otp/request', rate_limiting_1.otpRateLimit, auth_controller_1.AuthController.requestOTP);
router.post('/otp/verify', rate_limiting_1.strictRateLimit, auth_controller_1.AuthController.verifyOTP);
router.post('/refresh', auth_controller_1.AuthController.refreshToken);
router.post('/logout', authenticate_1.authenticate, auth_controller_1.AuthController.logout);
router.post('/logout-all', authenticate_1.authenticate, auth_controller_1.AuthController.logoutAll);
router.get('/profile', authenticate_1.authenticate, auth_controller_1.AuthController.getProfile);
exports.default = router;
//# sourceMappingURL=index.js.map