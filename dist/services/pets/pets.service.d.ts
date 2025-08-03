import { PetStatus } from '@prisma/client';
import { PaginationMeta, PetRegistration, VaccinationInput } from '../../types';
export declare class PetsService {
    static createPet(ownerId: string, petData: PetRegistration, registeredBy?: string): Promise<{
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
    }>;
    static getPetsByOwner(ownerId: string, page?: number, limit?: number, status?: PetStatus): Promise<{
        pets: ({
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
            qrCodes: {
                id: string;
                status: import(".prisma/client").$Enums.QRStatus;
                qrCodeString: string;
                assignedAt: Date | null;
            }[];
            vaccinationRecords: ({
                vaccineType: {
                    id: number;
                    vaccineName: string;
                    speciesApplicability: number[];
                    durationMonths: number | null;
                    isRequiredByLaw: boolean;
                };
            } & {
                id: string;
                createdAt: Date;
                petId: string;
                vaccineTypeId: number;
                administeredDate: Date;
                expirationDate: Date | null;
                batchNumber: string | null;
                veterinarianName: string | null;
                clinicName: string | null;
                notes: string | null;
                certificateUrl: string | null;
            })[];
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
        meta: PaginationMeta;
    }>;
    static getPetById(petId: string, userId?: string): Promise<{
        species: {
            id: number;
            category: string;
            speciesName: string;
        } | null;
        owner: {
            user: {
                email: string | null;
                phone: string | null;
                id: string;
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
        secondaryBreed: {
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
            qrImageUrl: string | null;
            assignedAt: Date | null;
            activatedAt: Date | null;
        }[];
        vaccinationRecords: ({
            vaccineType: {
                id: number;
                vaccineName: string;
                speciesApplicability: number[];
                durationMonths: number | null;
                isRequiredByLaw: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            petId: string;
            vaccineTypeId: number;
            administeredDate: Date;
            expirationDate: Date | null;
            batchNumber: string | null;
            veterinarianName: string | null;
            clinicName: string | null;
            notes: string | null;
            certificateUrl: string | null;
        })[];
        medicalRecords: {
            id: string;
            createdAt: Date;
            petId: string;
            veterinarianName: string | null;
            clinicName: string | null;
            visitDate: Date;
            diagnosis: string | null;
            treatment: string | null;
            medications: import("@prisma/client/runtime/library").JsonValue | null;
            followUpRequired: boolean;
            followUpDate: Date | null;
            cost: import("@prisma/client/runtime/library").Decimal | null;
            documentUrls: string[];
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
    }>;
    static updatePet(petId: string, userId: string, updateData: Partial<PetRegistration>): Promise<{
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
    }>;
    static deletePet(petId: string, userId: string): Promise<{
        message: string;
    }>;
    static addVaccinationRecords(petId: string, vaccinations: VaccinationInput[]): Promise<({
        vaccineType: {
            id: number;
            vaccineName: string;
            speciesApplicability: number[];
            durationMonths: number | null;
            isRequiredByLaw: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        petId: string;
        vaccineTypeId: number;
        administeredDate: Date;
        expirationDate: Date | null;
        batchNumber: string | null;
        veterinarianName: string | null;
        clinicName: string | null;
        notes: string | null;
        certificateUrl: string | null;
    })[]>;
    static getPetVaccinations(petId: string, userId?: string): Promise<({
        vaccineType: {
            id: number;
            vaccineName: string;
            speciesApplicability: number[];
            durationMonths: number | null;
            isRequiredByLaw: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        petId: string;
        vaccineTypeId: number;
        administeredDate: Date;
        expirationDate: Date | null;
        batchNumber: string | null;
        veterinarianName: string | null;
        clinicName: string | null;
        notes: string | null;
        certificateUrl: string | null;
    })[]>;
    static getSpeciesAndBreeds(): Promise<({
        breeds: {
            id: number;
            speciesId: number;
            breedName: string;
            sizeCategory: import(".prisma/client").$Enums.SizeCategory | null;
            typicalLifespanYears: number | null;
        }[];
    } & {
        id: number;
        category: string;
        speciesName: string;
    })[]>;
    static getVaccineTypes(): Promise<{
        id: number;
        vaccineName: string;
        speciesApplicability: number[];
        durationMonths: number | null;
        isRequiredByLaw: boolean;
    }[]>;
}
//# sourceMappingURL=pets.service.d.ts.map