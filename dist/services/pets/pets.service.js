"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PetsService = void 0;
const database_1 = __importDefault(require("../../config/database"));
const types_1 = require("../../types");
class PetsService {
    static async createPet(ownerId, petData, registeredBy) {
        const { name, speciesId, breedId, secondaryBreedId, gender, birthDate, color, weight, height, distinctiveMarks, isSpayedNeutered, microchipId, specialNeeds, behavioralNotes, vaccinations = [], } = petData;
        if (speciesId) {
            const speciesIdInt = parseInt(speciesId.toString(), 10);
            if (isNaN(speciesIdInt)) {
                throw new types_1.AppError('Invalid species ID format', 400);
            }
            const species = await database_1.default.petSpecies.findUnique({
                where: { id: speciesIdInt },
            });
            if (!species) {
                throw new types_1.AppError('Invalid species ID', 400);
            }
        }
        if (breedId) {
            const breedIdInt = parseInt(breedId.toString(), 10);
            if (isNaN(breedIdInt)) {
                throw new types_1.AppError('Invalid breed ID format', 400);
            }
            const breed = await database_1.default.petBreed.findUnique({
                where: { id: breedIdInt },
            });
            if (!breed) {
                throw new types_1.AppError('Invalid breed ID', 400);
            }
        }
        if (microchipId) {
            const existingPet = await database_1.default.pet.findUnique({
                where: { microchipId },
            });
            if (existingPet) {
                throw new types_1.AppError('Microchip ID already exists', 409);
            }
        }
        const pet = await database_1.default.pet.create({
            data: {
                ownerId,
                registeredBy,
                name,
                speciesId: speciesId ? parseInt(speciesId.toString(), 10) : null,
                breedId: breedId ? parseInt(breedId.toString(), 10) : null,
                secondaryBreedId: secondaryBreedId ? parseInt(secondaryBreedId.toString(), 10) : null,
                gender: gender,
                birthDate: birthDate ? new Date(birthDate) : null,
                color,
                weightKg: weight,
                heightCm: height,
                distinctiveMarks,
                isSpayedNeutered,
                microchipId,
                specialNeeds,
                behavioralNotes,
            },
            include: {
                species: true,
                breed: true,
                secondaryBreed: true,
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
        });
        if (vaccinations.length > 0) {
            await this.addVaccinationRecords(pet.id, vaccinations);
        }
        return pet;
    }
    static async getPetsByOwner(ownerId, page = 1, limit = 25, status) {
        const offset = (page - 1) * limit;
        const where = {
            ownerId,
            ...(status && { status }),
        };
        const [pets, total] = await Promise.all([
            database_1.default.pet.findMany({
                where,
                include: {
                    species: true,
                    breed: true,
                    secondaryBreed: true,
                    qrCodes: {
                        where: { status: 'active' },
                        select: {
                            id: true,
                            qrCodeString: true,
                            status: true,
                            assignedAt: true,
                        },
                    },
                    vaccinationRecords: {
                        orderBy: { administeredDate: 'desc' },
                        take: 3,
                        include: {
                            vaccineType: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit,
            }),
            database_1.default.pet.count({ where }),
        ]);
        const meta = {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        };
        return { pets, meta };
    }
    static async getPetById(petId, userId) {
        const pet = await database_1.default.pet.findUnique({
            where: { id: petId },
            include: {
                owner: {
                    include: {
                        user: {
                            select: {
                                id: true,
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
                secondaryBreed: true,
                qrCodes: {
                    select: {
                        id: true,
                        qrCodeString: true,
                        status: true,
                        assignedAt: true,
                        activatedAt: true,
                        qrImageUrl: true,
                    },
                },
                vaccinationRecords: {
                    orderBy: { administeredDate: 'desc' },
                    include: {
                        vaccineType: true,
                    },
                },
                medicalRecords: {
                    orderBy: { visitDate: 'desc' },
                },
            },
        });
        if (!pet) {
            throw new types_1.AppError('Pet not found', 404);
        }
        if (userId && pet.owner.userId !== userId) {
            const user = await database_1.default.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });
            if (!user || user.role === 'pet_owner') {
                throw new types_1.AppError('Not authorized to view this pet', 403);
            }
        }
        return pet;
    }
    static async updatePet(petId, userId, updateData) {
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
                throw new types_1.AppError('Not authorized to update this pet', 403);
            }
        }
        if (updateData.microchipId && updateData.microchipId !== pet.microchipId) {
            const existingPet = await database_1.default.pet.findUnique({
                where: { microchipId: updateData.microchipId },
            });
            if (existingPet) {
                throw new types_1.AppError('Microchip ID already exists', 409);
            }
        }
        const updatedPet = await database_1.default.pet.update({
            where: { id: petId },
            data: {
                ...(updateData.name && { name: updateData.name }),
                ...(updateData.speciesId && { speciesId: parseInt(updateData.speciesId.toString(), 10) }),
                ...(updateData.breedId && { breedId: parseInt(updateData.breedId.toString(), 10) }),
                ...(updateData.secondaryBreedId && { secondaryBreedId: parseInt(updateData.secondaryBreedId.toString(), 10) }),
                ...(updateData.gender && { gender: updateData.gender }),
                ...(updateData.birthDate && { birthDate: new Date(updateData.birthDate) }),
                ...(updateData.color && { color: updateData.color }),
                ...(updateData.weight && { weightKg: updateData.weight }),
                ...(updateData.height && { heightCm: updateData.height }),
                ...(updateData.distinctiveMarks !== undefined && { distinctiveMarks: updateData.distinctiveMarks }),
                ...(updateData.isSpayedNeutered !== undefined && { isSpayedNeutered: updateData.isSpayedNeutered }),
                ...(updateData.microchipId !== undefined && { microchipId: updateData.microchipId }),
                ...(updateData.specialNeeds !== undefined && { specialNeeds: updateData.specialNeeds }),
                ...(updateData.behavioralNotes !== undefined && { behavioralNotes: updateData.behavioralNotes }),
            },
            include: {
                species: true,
                breed: true,
                secondaryBreed: true,
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
        });
        return updatedPet;
    }
    static async deletePet(petId, userId) {
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
            if (!user || user.role !== 'admin') {
                throw new types_1.AppError('Not authorized to delete this pet', 403);
            }
        }
        await database_1.default.pet.delete({
            where: { id: petId },
        });
        return { message: 'Pet deleted successfully' };
    }
    static async addVaccinationRecords(petId, vaccinations) {
        const records = await Promise.all(vaccinations.map(async (vaccination) => {
            let vaccineType = await database_1.default.vaccineType.findFirst({
                where: { vaccineName: vaccination.vaccineName },
            });
            if (!vaccineType) {
                vaccineType = await database_1.default.vaccineType.create({
                    data: {
                        vaccineName: vaccination.vaccineName,
                        speciesApplicability: [],
                        durationMonths: 12,
                        isRequiredByLaw: false,
                    },
                });
            }
            return database_1.default.vaccinationRecord.create({
                data: {
                    petId,
                    vaccineTypeId: vaccineType.id,
                    administeredDate: new Date(vaccination.administeredDate),
                    expirationDate: vaccination.expirationDate ? new Date(vaccination.expirationDate) : null,
                    batchNumber: vaccination.batchNumber,
                    veterinarianName: vaccination.veterinarianName,
                    clinicName: vaccination.clinicName,
                    notes: vaccination.notes,
                },
                include: {
                    vaccineType: true,
                },
            });
        }));
        return records;
    }
    static async getPetVaccinations(petId, userId) {
        if (userId) {
            const pet = await this.getPetById(petId, userId);
        }
        const vaccinations = await database_1.default.vaccinationRecord.findMany({
            where: { petId },
            include: {
                vaccineType: true,
            },
            orderBy: { administeredDate: 'desc' },
        });
        return vaccinations;
    }
    static async getSpeciesAndBreeds() {
        const species = await database_1.default.petSpecies.findMany({
            include: {
                breeds: {
                    orderBy: { breedName: 'asc' },
                },
            },
            orderBy: { speciesName: 'asc' },
        });
        return species;
    }
    static async getVaccineTypes() {
        const vaccineTypes = await database_1.default.vaccineType.findMany({
            orderBy: { vaccineName: 'asc' },
        });
        return vaccineTypes;
    }
}
exports.PetsService = PetsService;
//# sourceMappingURL=pets.service.js.map