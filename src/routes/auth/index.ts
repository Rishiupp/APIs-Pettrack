import { Router } from 'express';
import { AuthController } from '../../controllers/auth/auth.controller';
import { authenticate } from '../../middleware/auth/authenticate';
import { otpRateLimit, strictRateLimit } from '../../middleware/rate-limiting';

const router = Router();

// Debug middleware to log all request bodies
router.use((req, res, next) => {
  console.log(`AUTH ROUTE DEBUG - ${req.method} ${req.path}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  next();
});

// Debug endpoint to test request body parsing
router.post('/debug', (req, res) => {
  res.json({
    success: true,
    debug: {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url,
      query: req.query
    }
  });
});

// Public routes - New Authentication Flow
router.post('/register', strictRateLimit, AuthController.register); // Step 1: Request OTP for registration
router.post('/register/complete', strictRateLimit, AuthController.completeRegistration); // Step 2: Complete registration with OTP

// Login flow (phone-only)
router.post('/login/otp/request', AuthController.requestLoginOTP); // Step 1: Request OTP for login
router.post('/login/otp/verify', strictRateLimit, AuthController.verifyLoginOTP); // Step 2: Verify OTP and login

// Legacy routes (keep for backward compatibility)
router.post('/otp/request', AuthController.requestOTP);
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