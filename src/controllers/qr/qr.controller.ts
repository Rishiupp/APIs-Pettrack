import { Request, Response } from 'express';
import { QRService } from '../../services/qr/qr.service';
import { ResponseHandler } from '../../utils/response';
import { ValidationUtil } from '../../utils/validation';
import { AuthRequest } from '../../types';
import { asyncHandler } from '../../middleware/error-handling';
import prisma from '../../config/database';

export class QRController {
  static getAvailableQRCodes = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit as string);

    if (limitNum < 1 || limitNum > 100) {
      return ResponseHandler.validationError(res, [{
        field: 'limit',
        message: 'Limit must be between 1 and 100',
        value: limitNum,
      }]);
    }

    const qrCodes = await QRService.getAvailableQRCodes(limitNum);
    return ResponseHandler.success(res, qrCodes);
  });

  static assignQRToPet = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { petId } = req.params;
    const { qrId, paymentEventId } = req.body;
    const userId = req.user!.id;

    // Validate input
    const errors = ValidationUtil.validateRequired({
      qrId,
    });

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    // TODO: Verify payment if paymentEventId is provided
    if (paymentEventId) {
      // Verify that payment was successful for QR registration
      const paymentEvent = await prisma.paymentEvent.findUnique({
        where: {
          id: paymentEventId,
          userId,
          petId,
          paymentPurpose: 'qr_registration',
          status: 'success',
        },
      });

      if (!paymentEvent) {
        return ResponseHandler.error(res, 'Valid payment required for QR assignment', 400);
      }
    }

    if (!petId) {
      return ResponseHandler.error(res, 'Pet ID is required', 400);
    }

    const result = await QRService.assignQRCodeToPet(qrId, petId, userId);
    return ResponseHandler.success(res, result, 'QR code assigned successfully');
  });

  static scanQRCode = asyncHandler(async (req: Request, res: Response) => {
    const { qrCodeString } = req.params;
    const scanData = req.body;

    // Validate coordinates if provided
    if (scanData.location) {
      const coordErrors = ValidationUtil.validateCoordinates(
        scanData.location.latitude,
        scanData.location.longitude
      );

      if (coordErrors.length > 0) {
        return ResponseHandler.validationError(res, coordErrors);
      }
    }

    if (!qrCodeString) {
      return ResponseHandler.error(res, 'QR code string is required', 400);
    }

    const result = await QRService.scanQRCode(qrCodeString, scanData, req);
    return ResponseHandler.success(res, result);
  });

  static getPetQRCodes = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { petId } = req.params;
    const userId = req.user!.id;

    if (!petId) {
      return ResponseHandler.error(res, 'Pet ID is required', 400);
    }

    const qrCodes = await QRService.getPetQRCodes(petId, userId);
    return ResponseHandler.success(res, qrCodes);
  });

  static getPetScanHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { petId } = req.params;
    const { page, limit } = req.query;
    const userId = req.user!.id;

    const { page: validPage, limit: validLimit, errors } = ValidationUtil.validatePagination(
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    if (!petId) {
      return ResponseHandler.error(res, 'Pet ID is required', 400);
    }

    const result = await QRService.getPetScanHistory(petId, userId, validPage, validLimit);
    return ResponseHandler.success(res, result.scans, undefined, 200, result.meta);
  });

  static activateQRCode = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { qrId } = req.params;

    // Only admins and executives can activate QR codes
    const user = req.user!;
    if (user.role === 'pet_owner') {
      return ResponseHandler.forbidden(res, 'Not authorized to activate QR codes');
    }

    if (!qrId) {
      return ResponseHandler.error(res, 'QR ID is required', 400);
    }

    const result = await QRService.activateQRCode(qrId);
    return ResponseHandler.success(res, result, 'QR code activated successfully');
  });
}