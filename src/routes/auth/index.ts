import { Router } from 'express';
import { AuthController } from '../../controllers/auth/auth.controller';
import { authenticate } from '../../middleware/auth/authenticate';
import { otpRateLimit, strictRateLimit } from '../../middleware/rate-limiting';

const router = Router();

// Public routes
router.post('/register', strictRateLimit, AuthController.register);
router.post('/otp/request', otpRateLimit, AuthController.requestOTP);
router.post('/otp/verify', strictRateLimit, AuthController.verifyOTP);
router.post('/refresh', AuthController.refreshToken);

// OAuth routes
router.post('/google', strictRateLimit, AuthController.googleLogin);
router.post('/apple', strictRateLimit, AuthController.appleLogin);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.post('/logout-all', authenticate, AuthController.logoutAll);
router.get('/profile', authenticate, AuthController.getProfile);

export default router;