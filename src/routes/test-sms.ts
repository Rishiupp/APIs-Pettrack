import { Router, Request, Response } from 'express';
import { SMSService } from '../services/sms/sms.service';
import { ResponseHandler } from '../utils/response';
import { asyncHandler } from '../middleware/error-handling';

const router = Router();

// Test SMS endpoint - only for development
if (process.env.NODE_ENV === 'development') {
  router.post('/send-test-sms', asyncHandler(async (req: Request, res: Response) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return ResponseHandler.validationError(res, [
        { field: 'phone', message: 'Phone number is required' },
        { field: 'message', message: 'Message is required' }
      ]);
    }

    const success = await SMSService.sendSMS(phone, message);
    
    if (success) {
      return ResponseHandler.success(res, { success: true }, 'SMS sent successfully');
    } else {
      return ResponseHandler.error(res, 'Failed to send SMS', 500);
    }
  }));

  router.post('/send-test-otp', asyncHandler(async (req: Request, res: Response) => {
    const { phone } = req.body;

    if (!phone) {
      return ResponseHandler.validationError(res, [
        { field: 'phone', message: 'Phone number is required' }
      ]);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const success = await SMSService.sendOTP(phone, otp);
    
    if (success) {
      return ResponseHandler.success(res, { success: true, otp }, 'Test OTP sent successfully');
    } else {
      return ResponseHandler.error(res, 'Failed to send OTP', 500);
    }
  }));
}

export default router;