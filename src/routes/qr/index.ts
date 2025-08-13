import { Router } from 'express';
import { QRController } from '../../controllers/qr/qr.controller';
import { authenticate } from '../../middleware/auth/authenticate';
import { requireAuthenticated, requireExecutive } from '../../middleware/auth/authorize';
import { qrScanRateLimit } from '../../middleware/rate-limiting';

const router = Router();

// Public QR scan endpoint (no authentication required)
router.get('/:qrCodeString/scan', qrScanRateLimit, QRController.scanQRCode);
router.post('/:qrCodeString/scan', qrScanRateLimit, QRController.scanQRCode);

// Protected endpoints (require authentication)
router.use(authenticate);

// Get available QR codes (for assignment)
router.get('/available', requireExecutive, QRController.getAvailableQRCodes);

// Pet-specific QR operations
router.post('/pets/:petId/assign', requireAuthenticated, QRController.assignQRToPet);
router.get('/pets/:petId/codes', requireAuthenticated, QRController.getPetQRCodes);
router.get('/pets/:petId/scans', requireAuthenticated, QRController.getPetScanHistory);
router.get('/pets/:petId/locations', requireAuthenticated, QRController.getPetScanLocations);

// QR code management
router.post('/:qrId/activate', requireExecutive, QRController.activateQRCode);

export default router;