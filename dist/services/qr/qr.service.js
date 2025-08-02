"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QRService = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const crypto_1 = require("../../utils/crypto");
const types_1 = require("../../types");
const config_1 = require("../../config");
class QRService {
    static async generateQRCodes(poolId, quantity) {
        const qrCodes = [];
        for (let i = 0; i < quantity; i++) {
            const qrCodeString = crypto_1.CryptoUtil.generateQRCodeString();
            const qrCodeHash = crypto_1.CryptoUtil.hashQRCode(qrCodeString);
            const qrCodeUrl = `${config_1.config.qr.baseUrl}/${qrCodeString}`;
            const qrImageDataUrl = await qrcode_1.default.toDataURL(qrCodeUrl, {
                errorCorrectionLevel: config_1.config.qr.errorCorrection,
                width: config_1.config.qr.size,
                margin: 2,
            });
            qrCodes.push({
                poolId,
                qrCodeString,
                qrCodeHash,
                qrImageUrl: qrImageDataUrl,
            });
        }
        const createdCodes = await database_1.default.qRCode.createMany({
            data: qrCodes,
        });
        await database_1.default.qRCodePool.update({
            where: { id: poolId },
            data: {
                usedCount: {
                    increment: quantity,
                },
            },
        });
        return { created: createdCodes.count, codes: qrCodes };
    }
    static async assignQRCodeToPet(qrId, petId, userId) {
        const pet = await database_1.default.pet.findUnique({
            where: { id: petId },
            include: { owner: true },
        });
        if (!pet) {
            throw new types_1.AppError('Pet not found', 404);
        }
        if (pet.owner.userId !== userId) {
            const user = await database_1.default.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });
            if (!user || user.role === 'pet_owner') {
                throw new types_1.AppError('Not authorized to assign QR code to this pet', 403);
            }
        }
        const qrCode = await database_1.default.qRCode.findUnique({
            where: { id: qrId },
        });
        if (!qrCode) {
            throw new types_1.AppError('QR code not found', 404);
        }
        if (qrCode.status !== client_1.QRStatus.available) {
            throw new types_1.AppError('QR code is not available for assignment', 400);
        }
        const existingQR = await database_1.default.qRCode.findFirst({
            where: {
                assignedToPet: petId,
                status: client_1.QRStatus.active,
            },
        });
        if (existingQR) {
            throw new types_1.AppError('Pet already has an active QR code', 400);
        }
        const updatedQR = await database_1.default.qRCode.update({
            where: { id: qrId },
            data: {
                status: client_1.QRStatus.assigned,
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
    static async activateQRCode(qrId) {
        const qrCode = await database_1.default.qRCode.findUnique({
            where: { id: qrId },
        });
        if (!qrCode) {
            throw new types_1.AppError('QR code not found', 404);
        }
        if (qrCode.status !== client_1.QRStatus.assigned) {
            throw new types_1.AppError('QR code must be assigned before activation', 400);
        }
        const updatedQR = await database_1.default.qRCode.update({
            where: { id: qrId },
            data: {
                status: client_1.QRStatus.active,
                activatedAt: new Date(),
            },
        });
        return updatedQR;
    }
    static async scanQRCode(qrCodeString, scanData, req) {
        const qrCode = await database_1.default.qRCode.findUnique({
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
                        breed: true,
                    },
                },
            },
        });
        if (!qrCode) {
            await this.logScanEvent(null, {
                scanResult: client_1.ScanResult.invalid,
                scannerIp: req.ip,
                userAgent: req.get('User-Agent'),
                scanLocation: scanData.location,
                scannerContactInfo: scanData.scannerContact,
            });
            throw new types_1.AppError('Invalid QR code', 404);
        }
        let scanResult = client_1.ScanResult.success;
        if (qrCode.status !== client_1.QRStatus.active) {
            scanResult = client_1.ScanResult.invalid;
        }
        if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
            scanResult = client_1.ScanResult.expired;
        }
        const scanEvent = await this.logScanEvent(qrCode.id, {
            scanResult,
            scannerIp: req.ip,
            userAgent: req.get('User-Agent'),
            scanLocation: scanData.location,
            scannerContactInfo: scanData.scannerContact,
        });
        if (scanResult === client_1.ScanResult.success && scanData.scannerContact && qrCode.pet) {
            await this.notifyPetOwner(qrCode.pet, scanEvent, scanData.scannerContact);
        }
        if (scanResult !== client_1.ScanResult.success) {
            const errorMessage = scanResult === client_1.ScanResult.expired ? 'QR code has expired' : 'QR code is not active';
            throw new types_1.AppError(errorMessage, 400);
        }
        return {
            pet: qrCode.pet,
            scanEvent,
            message: 'QR code scanned successfully',
        };
    }
    static async logScanEvent(qrId, scanData) {
        let locationString = null;
        let locationName = null;
        let city = null;
        let countryCode = null;
        if (scanData.scanLocation) {
            locationString = `POINT(${scanData.scanLocation.longitude} ${scanData.scanLocation.latitude})`;
            locationName = 'Unknown Location';
            city = 'Unknown City';
            countryCode = 'IN';
        }
        const scanEvent = await database_1.default.qRScanEvent.create({
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
                scannerContactInfo: scanData.scannerContactInfo,
                deviceType: this.detectDeviceType(scanData.userAgent),
            },
        });
        return scanEvent;
    }
    static detectDeviceType(userAgent) {
        if (!userAgent)
            return client_1.DeviceType.mobile;
        const ua = userAgent.toLowerCase();
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return client_1.DeviceType.mobile;
        }
        if (ua.includes('tablet') || ua.includes('ipad')) {
            return client_1.DeviceType.tablet;
        }
        return client_1.DeviceType.desktop;
    }
    static async notifyPetOwner(pet, _scanEvent, scannerContact) {
        console.log(`Notifying pet owner: ${pet.owner.user.firstName} ${pet.owner.user.lastName}`);
        console.log(`Pet ${pet.name} was scanned by ${scannerContact.name || 'someone'}`);
    }
    static async getAvailableQRCodes(limit = 10) {
        const qrCodes = await database_1.default.qRCode.findMany({
            where: { status: client_1.QRStatus.available },
            take: limit,
            orderBy: { createdAt: 'asc' },
        });
        return qrCodes;
    }
    static async getPetQRCodes(petId, userId) {
        const pet = await database_1.default.pet.findUnique({
            where: { id: petId },
            include: { owner: true },
        });
        if (!pet) {
            throw new types_1.AppError('Pet not found', 404);
        }
        if (pet.owner.userId !== userId) {
            const user = await database_1.default.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });
            if (!user || user.role === 'pet_owner') {
                throw new types_1.AppError('Not authorized to view QR codes for this pet', 403);
            }
        }
        const qrCodes = await database_1.default.qRCode.findMany({
            where: { assignedToPet: petId },
            orderBy: { assignedAt: 'desc' },
        });
        return qrCodes;
    }
    static async getPetScanHistory(petId, userId, page = 1, limit = 25) {
        const pet = await database_1.default.pet.findUnique({
            where: { id: petId },
            include: { owner: true },
        });
        if (!pet) {
            throw new types_1.AppError('Pet not found', 404);
        }
        if (pet.owner.userId !== userId) {
            const user = await database_1.default.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });
            if (!user || user.role === 'pet_owner') {
                throw new types_1.AppError('Not authorized to view scan history for this pet', 403);
            }
        }
        const offset = (page - 1) * limit;
        const [scans, total] = await Promise.all([
            database_1.default.qRScanEvent.findMany({
                where: {
                    qrCode: {
                        assignedToPet: petId,
                    },
                },
                orderBy: { scanTimestamp: 'desc' },
                skip: offset,
                take: limit,
            }),
            database_1.default.qRScanEvent.count({
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
}
exports.QRService = QRService;
//# sourceMappingURL=qr.service.js.map