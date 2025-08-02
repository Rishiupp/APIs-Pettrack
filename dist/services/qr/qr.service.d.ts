import { QRScanRequest } from '../../types';
export declare class QRService {
    static generateQRCodes(poolId: string, quantity: number): Promise<{
        created: number;
        codes: {
            poolId: string;
            qrCodeString: string;
            qrCodeHash: string;
            qrImageUrl: string;
        }[];
    }>;
    static assignQRCodeToPet(qrId: string, petId: string, userId: string): Promise<{
        pet: ({
            owner: {
                user: {
                    email: string;
                    phone: string | null;
                    firstName: string;
                    lastName: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                countryCode: string;
                state: string | null;
                city: string | null;
                addressLine1: string | null;
                addressLine2: string | null;
                postalCode: string | null;
                emergencyContactName: string | null;
                emergencyContactPhone: string | null;
            };
        } & {
            birthDate: Date | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            ownerId: string;
            registeredBy: string | null;
            speciesId: number | null;
            breedId: number | null;
            secondaryBreedId: number | null;
            gender: import(".prisma/client").$Enums.Gender;
            color: string | null;
            weightKg: import("@prisma/client/runtime/library").Decimal | null;
            heightCm: import("@prisma/client/runtime/library").Decimal | null;
            distinctiveMarks: string | null;
            isSpayedNeutered: boolean | null;
            microchipId: string | null;
            registrationNumber: string | null;
            status: import(".prisma/client").$Enums.PetStatus;
            specialNeeds: string | null;
            behavioralNotes: string | null;
            profileImageUrl: string | null;
        }) | null;
    } & {
        id: string;
        createdAt: Date;
        expiresAt: Date | null;
        status: import(".prisma/client").$Enums.QRStatus;
        poolId: string | null;
        qrCodeString: string;
        qrCodeHash: string;
        qrImageUrl: string | null;
        assignedToPet: string | null;
        assignedAt: Date | null;
        activatedAt: Date | null;
    }>;
    static activateQRCode(qrId: string): Promise<{
        id: string;
        createdAt: Date;
        expiresAt: Date | null;
        status: import(".prisma/client").$Enums.QRStatus;
        poolId: string | null;
        qrCodeString: string;
        qrCodeHash: string;
        qrImageUrl: string | null;
        assignedToPet: string | null;
        assignedAt: Date | null;
        activatedAt: Date | null;
    }>;
    static scanQRCode(qrCodeString: string, scanData: QRScanRequest, req: any): Promise<{
        pet: ({
            species: {
                id: number;
                category: string;
                speciesName: string;
            } | null;
            owner: {
                user: {
                    email: string;
                    phone: string | null;
                    firstName: string;
                    lastName: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                countryCode: string;
                state: string | null;
                city: string | null;
                addressLine1: string | null;
                addressLine2: string | null;
                postalCode: string | null;
                emergencyContactName: string | null;
                emergencyContactPhone: string | null;
            };
            breed: {
                id: number;
                speciesId: number;
                breedName: string;
                sizeCategory: import(".prisma/client").$Enums.SizeCategory | null;
                typicalLifespanYears: number | null;
            } | null;
        } & {
            birthDate: Date | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            ownerId: string;
            registeredBy: string | null;
            speciesId: number | null;
            breedId: number | null;
            secondaryBreedId: number | null;
            gender: import(".prisma/client").$Enums.Gender;
            color: string | null;
            weightKg: import("@prisma/client/runtime/library").Decimal | null;
            heightCm: import("@prisma/client/runtime/library").Decimal | null;
            distinctiveMarks: string | null;
            isSpayedNeutered: boolean | null;
            microchipId: string | null;
            registrationNumber: string | null;
            status: import(".prisma/client").$Enums.PetStatus;
            specialNeeds: string | null;
            behavioralNotes: string | null;
            profileImageUrl: string | null;
        }) | null;
        scanEvent: {
            id: string;
            createdAt: Date;
            qrId: string;
            locationName: string | null;
            countryCode: string | null;
            city: string | null;
            userAgent: string | null;
            scanTimestamp: Date;
            scannerIp: string | null;
            deviceType: import(".prisma/client").$Enums.DeviceType | null;
            scanLocation: string | null;
            locationAccuracy: import("@prisma/client/runtime/library").Decimal | null;
            scannerContactInfo: import("@prisma/client/runtime/library").JsonValue | null;
            scanResult: import(".prisma/client").$Enums.ScanResult;
        };
        message: string;
    }>;
    private static logScanEvent;
    private static detectDeviceType;
    private static notifyPetOwner;
    static getAvailableQRCodes(limit?: number): Promise<{
        id: string;
        createdAt: Date;
        expiresAt: Date | null;
        status: import(".prisma/client").$Enums.QRStatus;
        poolId: string | null;
        qrCodeString: string;
        qrCodeHash: string;
        qrImageUrl: string | null;
        assignedToPet: string | null;
        assignedAt: Date | null;
        activatedAt: Date | null;
    }[]>;
    static getPetQRCodes(petId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        expiresAt: Date | null;
        status: import(".prisma/client").$Enums.QRStatus;
        poolId: string | null;
        qrCodeString: string;
        qrCodeHash: string;
        qrImageUrl: string | null;
        assignedToPet: string | null;
        assignedAt: Date | null;
        activatedAt: Date | null;
    }[]>;
    static getPetScanHistory(petId: string, userId: string, page?: number, limit?: number): Promise<{
        scans: {
            id: string;
            createdAt: Date;
            qrId: string;
            locationName: string | null;
            countryCode: string | null;
            city: string | null;
            userAgent: string | null;
            scanTimestamp: Date;
            scannerIp: string | null;
            deviceType: import(".prisma/client").$Enums.DeviceType | null;
            scanLocation: string | null;
            locationAccuracy: import("@prisma/client/runtime/library").Decimal | null;
            scannerContactInfo: import("@prisma/client/runtime/library").JsonValue | null;
            scanResult: import(".prisma/client").$Enums.ScanResult;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
}
//# sourceMappingURL=qr.service.d.ts.map