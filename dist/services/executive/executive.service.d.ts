import { ExecutiveRegistration } from '../../types';
export declare class ExecutiveService {
    static registerPetWithOwner(executiveId: string, registrationData: ExecutiveRegistration): Promise<{
        user: {
            email: string | null;
            phone: string | null;
            id: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
            emailVerified: boolean;
            phoneVerified: boolean;
            lastLogin: Date | null;
            createdAt: Date;
            updatedAt: Date;
            googleId: string | null;
            appleId: string | null;
            profilePicture: string | null;
            authProvider: import(".prisma/client").$Enums.AuthProvider | null;
        };
        petOwner: {
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
        pet: {
            species: {
                id: number;
                category: string;
                speciesName: string;
            } | null;
            breed: {
                id: number;
                speciesId: number;
                breedName: string;
                sizeCategory: import(".prisma/client").$Enums.SizeCategory | null;
                typicalLifespanYears: number | null;
            } | null;
            secondaryBreed: {
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
        };
        paymentEvent: {
            id: string;
            createdAt: Date;
            userId: string | null;
            status: import(".prisma/client").$Enums.PaymentStatus;
            petId: string | null;
            qrId: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            paymentPurpose: import(".prisma/client").$Enums.PaymentPurpose;
            razorpayOrderId: string | null;
            razorpayPaymentId: string | null;
            razorpaySignature: string | null;
            paymentMethod: string | null;
            failureReason: string | null;
            completedAt: Date | null;
        } | undefined;
    }>;
    static getRegistrationHistory(executiveId: string, page?: number, limit?: number, from?: string): Promise<{
        registrations: ({
            paymentEvents: {
                id: string;
                createdAt: Date;
                status: import(".prisma/client").$Enums.PaymentStatus;
                amount: import("@prisma/client/runtime/library").Decimal;
                paymentMethod: string | null;
            }[];
            species: {
                id: number;
                category: string;
                speciesName: string;
            } | null;
            owner: {
                user: {
                    email: string | null;
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
            qrCodes: {
                id: string;
                status: import(".prisma/client").$Enums.QRStatus;
                qrCodeString: string;
                assignedAt: Date | null;
            }[];
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
        })[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    static getExecutiveStats(executiveId: string): Promise<{
        registrations: {
            total: number;
            thisMonth: number;
            today: number;
        };
        revenue: {
            total: number;
            thisMonth: number;
        };
    }>;
    static updateExecutiveProfile(executiveId: string, updateData: {
        territory?: string;
    }): Promise<{
        user: {
            email: string | null;
            phone: string | null;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        userId: string;
        employeeId: string;
        territory: string | null;
    }>;
    static getExecutiveProfile(executiveId: string): Promise<{
        user: {
            email: string | null;
            phone: string | null;
            id: string;
            firstName: string;
            lastName: string;
            createdAt: Date;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        userId: string;
        employeeId: string;
        territory: string | null;
    }>;
    static getDailyRegistrationReport(executiveId: string, date: string): Promise<{
        date: string;
        registrations: ({
            paymentEvents: {
                status: import(".prisma/client").$Enums.PaymentStatus;
                amount: import("@prisma/client/runtime/library").Decimal;
                paymentMethod: string | null;
            }[];
            species: {
                id: number;
                category: string;
                speciesName: string;
            } | null;
            owner: {
                user: {
                    email: string | null;
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
        })[];
        summary: {
            totalRegistrations: number;
            totalRevenue: number;
            bySpecies: Record<string, number>;
            byPaymentMethod: Record<string, number>;
        };
    }>;
    static getAllExecutives(page?: number, limit?: number): Promise<{
        executives: ({
            user: {
                email: string | null;
                phone: string | null;
                firstName: string;
                lastName: string;
                isActive: boolean;
                createdAt: Date;
            };
        } & {
            id: string;
            isActive: boolean;
            createdAt: Date;
            userId: string;
            employeeId: string;
            territory: string | null;
        })[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    static createExecutive(userData: {
        email: string;
        phone: string;
        firstName: string;
        lastName: string;
        employeeId: string;
        territory?: string;
    }): Promise<{
        user: {
            email: string | null;
            phone: string | null;
            id: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
            emailVerified: boolean;
            phoneVerified: boolean;
            lastLogin: Date | null;
            createdAt: Date;
            updatedAt: Date;
            googleId: string | null;
            appleId: string | null;
            profilePicture: string | null;
            authProvider: import(".prisma/client").$Enums.AuthProvider | null;
        };
        executive: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            userId: string;
            employeeId: string;
            territory: string | null;
        };
    }>;
    static deactivateExecutive(executiveId: string): Promise<{
        message: string;
    }>;
}
//# sourceMappingURL=executive.service.d.ts.map