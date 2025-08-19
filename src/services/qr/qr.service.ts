import QRCode from 'qrcode';
import { QRStatus, DeviceType, ScanResult } from '@prisma/client';
import prisma from '../../config/database';
import { CryptoUtil } from '../../utils/crypto';
import { AppError } from '../../types';
import { SMSService } from '../sms/sms.service';
import { config } from '../../config';
import { QRScanRequest, Location } from '../../types';

export class QRService {
  static async generateQRCodes(poolId: string, quantity: number) {
    const qrCodes = [];

    for (let i = 0; i < quantity; i++) {
      const qrCodeString = CryptoUtil.generateQRCodeString();
      const qrCodeHash = CryptoUtil.hashQRCode(qrCodeString);
      
      // Generate QR code image
      const qrCodeUrl = `${config.qr.baseUrl}/${qrCodeString}`;
      const qrImageDataUrl = await QRCode.toDataURL(qrCodeUrl, {
        errorCorrectionLevel: config.qr.errorCorrection as any,
        width: config.qr.size,
        margin: 2,
      });

      qrCodes.push({
        poolId,
        qrCodeString,
        qrCodeHash,
        qrImageUrl: qrImageDataUrl, // In production, save to file storage
      });
    }

    // Bulk insert QR codes
    const createdCodes = await prisma.qRCode.createMany({
      data: qrCodes,
    });

    // Update pool used count
    await prisma.qRCodePool.update({
      where: { id: poolId },
      data: {
        usedCount: {
          increment: quantity,
        },
      },
    });

    return { created: createdCodes.count, codes: qrCodes };
  }

  static async assignQRCodeToPet(qrId: string, petId: string, userId: string) {
    // Check if user owns the pet
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { owner: true },
    });

    if (!pet) {
      throw new AppError('Pet not found', 404);
    }

    if (pet.owner.userId !== userId) {
      // Check if user is executive/admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || user.role === 'pet_owner') {
        throw new AppError('Not authorized to assign QR code to this pet', 403);
      }
    }

    // Check if QR code is available
    const qrCode = await prisma.qRCode.findUnique({
      where: { id: qrId },
    });

    if (!qrCode) {
      throw new AppError('QR code not found', 404);
    }

    if (qrCode.status !== QRStatus.available) {
      throw new AppError('QR code is not available for assignment', 400);
    }

    // Check if pet already has an active QR code
    const existingQR = await prisma.qRCode.findFirst({
      where: {
        assignedToPet: petId,
        status: QRStatus.active,
      },
    });

    if (existingQR) {
      throw new AppError('Pet already has an active QR code', 400);
    }

    // Assign QR code to pet
    const updatedQR = await prisma.qRCode.update({
      where: { id: qrId },
      data: {
        status: QRStatus.assigned,
        assignedToPet: petId,
        assignedAt: new Date(),
      },
      include: {
        pet: {
          include: {
            owner: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return updatedQR;
  }

  static async activateQRCode(qrId: string) {
    const qrCode = await prisma.qRCode.findUnique({
      where: { id: qrId },
    });

    if (!qrCode) {
      throw new AppError('QR code not found', 404);
    }

    if (qrCode.status !== QRStatus.assigned) {
      throw new AppError('QR code must be assigned before activation', 400);
    }

    const updatedQR = await prisma.qRCode.update({
      where: { id: qrId },
      data: {
        status: QRStatus.active,
        activatedAt: new Date(),
      },
    });

    return updatedQR;
  }

  static async scanQRCode(qrCodeString: string, scanData: QRScanRequest, req: any) {
    // Find QR code
    const qrCode = await prisma.qRCode.findUnique({
      where: { qrCodeString },
      include: {
        pet: {
          include: {
            owner: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
            species: true,
          },
        },
      },
    });

    if (!qrCode) {
      // Log failed scan
      await this.logScanEvent(null, {
        scanResult: ScanResult.invalid,
        scannerIp: req.ip,
        userAgent: req.get('User-Agent'),
        scanLocation: scanData.location,
      });

      throw new AppError('Invalid QR code', 404);
    }

    // Check if QR code is active
    let scanResult: ScanResult = ScanResult.success;
    if (qrCode.status !== QRStatus.active) {
      scanResult = ScanResult.invalid;
    }

    // Check if QR code is expired
    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
      scanResult = ScanResult.expired;
    }

    // Log scan event
    const scanEvent = await this.logScanEvent(qrCode.id, {
      scanResult,
      scannerIp: req.ip,
      userAgent: req.get('User-Agent'),
      scanLocation: scanData.location,
    });

    // If scan was successful, send notification to owner
    if (scanResult === ScanResult.success && qrCode.pet) {
      await this.notifyPetOwner(qrCode.pet, scanEvent);
    }

    if (scanResult !== ScanResult.success) {
      const errorMessage = scanResult === ScanResult.expired ? 'QR code has expired' : 'QR code is not active';
      throw new AppError(errorMessage, 400);
    }

    return {
      pet: qrCode.pet,
      scanEvent,
      message: 'QR code scanned successfully',
    };
  }

  private static async logScanEvent(qrId: string | null, scanData: {
    scanResult: ScanResult;
    scannerIp?: string;
    userAgent?: string;
    scanLocation?: Location;
  }) {
    let locationString = null;
    let locationName = null;
    let city = null;
    let countryCode = null;

    if (scanData.scanLocation) {
      locationString = `POINT(${scanData.scanLocation.longitude} ${scanData.scanLocation.latitude})`;
      
      // TODO: Implement reverse geocoding to get location name
      // For now, use placeholder
      locationName = 'Unknown Location';
      city = 'Unknown City';
      countryCode = 'IN';
    }

    const scanEvent = await prisma.qRScanEvent.create({
      data: {
        qrId: qrId || 'unknown',
        scanResult: scanData.scanResult,
        scannerIp: scanData.scannerIp,
        userAgent: scanData.userAgent,
        scanLocation: locationString,
        locationAccuracy: scanData.scanLocation?.accuracy,
        locationName,
        city,
        countryCode,
        scannerContactInfo: undefined,
        deviceType: this.detectDeviceType(scanData.userAgent),
      },
    });

    return scanEvent;
  }

  private static detectDeviceType(userAgent?: string): DeviceType {
    if (!userAgent) return DeviceType.mobile;

    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return DeviceType.mobile;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return DeviceType.tablet;
    }
    return DeviceType.desktop;
  }

  private static async notifyPetOwner(pet: any, scanEvent: any) {
    try {
      // Send SMS notification to pet owner
      if (pet.owner?.user?.phone) {
        await SMSService.sendNotification(pet.owner.user.phone, pet.name, 'someone nearby');
      }

      // Also send push notification if available
      // TODO: Implement push notification service integration
      
      console.log(`Notification sent to pet owner: ${pet.owner.user.firstName} ${pet.owner.user.lastName}`);
      console.log(`Pet ${pet.name} was scanned at ${scanEvent.locationName || 'unknown location'}`);
    } catch (error) {
      console.error('Failed to notify pet owner:', error);
    }
  }

  static async getAvailableQRCodes(limit: number = 10) {
    const qrCodes = await prisma.qRCode.findMany({
      where: { status: QRStatus.available },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    return qrCodes;
  }

  static async getPetQRCodes(petId: string, userId: string) {
    // Check access to pet
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { owner: true },
    });

    if (!pet) {
      throw new AppError('Pet not found', 404);
    }

    if (pet.owner.userId !== userId) {
      // Check if user is executive/admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || user.role === 'pet_owner') {
        throw new AppError('Not authorized to view QR codes for this pet', 403);
      }
    }

    const qrCodes = await prisma.qRCode.findMany({
      where: { assignedToPet: petId },
      orderBy: { assignedAt: 'desc' },
    });

    return qrCodes;
  }

  static async getPetScanHistory(petId: string, userId: string, page: number = 1, limit: number = 25) {
    // Check access to pet
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { owner: true },
    });

    if (!pet) {
      throw new AppError('Pet not found', 404);
    }

    if (pet.owner.userId !== userId) {
      // Check if user is executive/admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || user.role === 'pet_owner') {
        throw new AppError('Not authorized to view scan history for this pet', 403);
      }
    }

    const offset = (page - 1) * limit;

    const [scans, total] = await Promise.all([
      prisma.qRScanEvent.findMany({
        where: {
          qrCode: {
            assignedToPet: petId,
          },
        },
        orderBy: { scanTimestamp: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.qRScanEvent.count({
        where: {
          qrCode: {
            assignedToPet: petId,
          },
        },
      }),
    ]);

    const meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };

    return { scans, meta };
  }

  static async getPetScanLocations(petId: string, userId: string) {
    // Check access to pet
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { owner: true },
    });

    if (!pet) {
      throw new AppError('Pet not found', 404);
    }

    if (pet.owner.userId !== userId) {
      // Check if user is executive/admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || user.role === 'pet_owner') {
        throw new AppError('Not authorized to view scan locations for this pet', 403);
      }
    }

    const scanLocations = await prisma.qRScanEvent.findMany({
      where: {
        qrCode: {
          assignedToPet: petId,
        },
        scanLocation: {
          not: null,
        },
        scanResult: 'success',
      },
      orderBy: { scanTimestamp: 'desc' },
      select: {
        id: true,
        scanLocation: true,
        locationAccuracy: true,
        locationName: true,
        city: true,
        countryCode: true,
        scanTimestamp: true,
        deviceType: true,
      },
    });

    // Parse location strings and convert to coordinates
    const locationsWithCoordinates = scanLocations.map((scan) => {
      let latitude = null;
      let longitude = null;

      if (scan.scanLocation) {
        // Parse "POINT(lng lat)" format
        const match = scan.scanLocation.match(/POINT\(([^)]+)\)/);
        if (match && match[1]) {
          const [lng, lat] = match[1].split(' ').map(Number);
          longitude = lng;
          latitude = lat;
        }
      }

      return {
        id: scan.id,
        latitude,
        longitude,
        accuracy: scan.locationAccuracy ? Number(scan.locationAccuracy) : null,
        locationName: scan.locationName,
        city: scan.city,
        countryCode: scan.countryCode,
        timestamp: scan.scanTimestamp,
        deviceType: scan.deviceType,
      };
    }).filter(location => location.latitude && location.longitude);

    return locationsWithCoordinates;
  }

  static async getLatestScansForAllUserPets(userId: string, limit: number = 10) {
    // Get all pets owned by the user
    const userPets = await prisma.pet.findMany({
      where: {
        owner: {
          userId,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (userPets.length === 0) {
      return [];
    }

    const petIds = userPets.map(pet => pet.id);

    // Get latest QR scans for all user's pets
    const latestScans = await prisma.qRScanEvent.findMany({
      where: {
        qrCode: {
          assignedToPet: {
            in: petIds,
          },
        },
        scanLocation: {
          not: null,
        },
        scanResult: 'success',
      },
      orderBy: { scanTimestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        scanLocation: true,
        locationAccuracy: true,
        locationName: true,
        city: true,
        countryCode: true,
        scanTimestamp: true,
        deviceType: true,
        qrCode: {
          select: {
            assignedToPet: true,
            pet: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Transform the data similar to getPetScanLocations
    const scanLocations = latestScans.map(scan => {
      let latitude = null;
      let longitude = null;

      if (scan.scanLocation) {
        const match = scan.scanLocation.match(/POINT\(([^)]+)\)/);
        if (match && match[1]) {
          const [lng, lat] = match[1].split(' ').map(Number);
          longitude = lng;
          latitude = lat;
        }
      }

      return {
        id: scan.id,
        latitude,
        longitude,
        accuracy: scan.locationAccuracy ? Number(scan.locationAccuracy) : null,
        locationName: scan.locationName,
        city: scan.city,
        countryCode: scan.countryCode,
        timestamp: scan.scanTimestamp,
        deviceType: scan.deviceType,
        petId: scan.qrCode.assignedToPet,
        petName: scan.qrCode.pet?.name || 'Unknown Pet',
      };
    }).filter(location => location.latitude && location.longitude);

    return scanLocations;
  }
}