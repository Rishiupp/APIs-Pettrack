"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const qr_controller_1 = require("../../controllers/qr/qr.controller");
const authenticate_1 = require("../../middleware/auth/authenticate");
const authorize_1 = require("../../middleware/auth/authorize");
const rate_limiting_1 = require("../../middleware/rate-limiting");
const router = (0, express_1.Router)();
router.get('/:qrCodeString/scan', rate_limiting_1.qrScanRateLimit, qr_controller_1.QRController.scanQRCode);
router.post('/:qrCodeString/scan', rate_limiting_1.qrScanRateLimit, qr_controller_1.QRController.scanQRCode);
router.use(authenticate_1.authenticate);
router.get('/available', authorize_1.requireExecutive, qr_controller_1.QRController.getAvailableQRCodes);
router.post('/pets/:petId/assign', authorize_1.requireAuthenticated, qr_controller_1.QRController.assignQRToPet);
router.get('/pets/:petId/codes', authorize_1.requireAuthenticated, qr_controller_1.QRController.getPetQRCodes);
router.get('/pets/:petId/scans', authorize_1.requireAuthenticated, qr_controller_1.QRController.getPetScanHistory);
router.post('/:qrId/activate', authorize_1.requireExecutive, qr_controller_1.QRController.activateQRCode);
exports.default = router;
//# sourceMappingURL=index.js.map