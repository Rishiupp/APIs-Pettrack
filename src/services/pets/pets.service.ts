import { PetStatus, Gender } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../types';
import { PaginationMeta, PetRegistration, VaccinationInput } from '../../types';

export class PetsService {
  static async createPet(ownerId: string, petData: PetRegistration, registeredBy?: string) {
    const {
      name,
      speciesId,
      breed,
      secondaryBreed,
      gender,
      birthDate,
      color,
      weight,
      height,
      distinctiveMarks,
      isSpayedNeutered,
      specialNeeds,
      behavioralNotes,
      vaccinations = [],
    } = petData;

    // Validate species and breed if provided
    if (speciesId) {
      const speciesIdInt = parseInt(speciesId.toString(), 10);
      if (isNaN(speciesIdInt)) {
        throw new AppError('Invalid species ID format', 400);
      }
      
      const species = await prisma.petSpecies.findUnique({
        where: { id: speciesIdInt },
      });
      if (!species) {
        throw new AppError('Invalid species ID', 400);
      }
    }



    // Create pet
    const pet = await prisma.pet.create({
      data: {
        ownerId,
        registeredBy,
        name,
        speciesId: speciesId ? parseInt(speciesId.toString(), 10) : null,
        breed,
        secondaryBreed,
        gender: gender as Gender,
        birthDate: birthDate ? new Date(birthDate) : null,
        color,
        weightKg: weight,
        heightCm: height,
        distinctiveMarks,
        isSpayedNeutered,
        specialNeeds,
        behavioralNotes,
      },
      include: {
        species: true,
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

    // Add vaccination records if provided
    if (vaccinations.length > 0) {
      await this.addVaccinationRecords(pet.id, vaccinations);
    }

    return pet;
  }

  static async getPetsByOwner(
    ownerId: string,
    page: number = 1,
    limit: number = 25,
    status?: PetStatus
  ) {
    const offset = (page - 1) * limit;
    const where = {
      ownerId,
      ...(status && { status }),
    };

    const [pets, total] = await Promise.all([
      prisma.pet.findMany({
        where,
        include: {
          species: true,
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
      prisma.pet.count({ where }),
    ]);

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };

    return { pets, meta };
  }

  static async getPetById(petId: string, userId?: string) {
    const pet = await prisma.pet.findUnique({
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
      throw new AppError('Pet not found', 404);
    }

    // Check if user has permission to view this pet
    if (userId && pet.owner.userId !== userId) {
      // Allow executives and admins to view any pet
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || user.role === 'pet_owner') {
        throw new AppError('Not authorized to view this pet', 403);
      }
    }

    return pet;
  }

  static async updatePet(petId: string, userId: string, updateData: Partial<PetRegistration>) {
    // Check ownership
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
        throw new AppError('Not authorized to update this pet', 403);
      }
    }


    const updatedPet = await prisma.pet.update({
      where: { id: petId },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.speciesId && { speciesId: parseInt(updateData.speciesId.toString(), 10) }),
        ...(updateData.breed && { breed: updateData.breed }),
        ...(updateData.secondaryBreed && { secondaryBreed: updateData.secondaryBreed }),
        ...(updateData.gender && { gender: updateData.gender as Gender }),
        ...(updateData.birthDate && { birthDate: new Date(updateData.birthDate) }),
        ...(updateData.color && { color: updateData.color }),
        ...(updateData.weight && { weightKg: updateData.weight }),
        ...(updateData.height && { heightCm: updateData.height }),
        ...(updateData.distinctiveMarks !== undefined && { distinctiveMarks: updateData.distinctiveMarks }),
        ...(updateData.isSpayedNeutered !== undefined && { isSpayedNeutered: updateData.isSpayedNeutered }),
        ...(updateData.specialNeeds !== undefined && { specialNeeds: updateData.specialNeeds }),
        ...(updateData.behavioralNotes !== undefined && { behavioralNotes: updateData.behavioralNotes }),
      },
      include: {
        species: true,
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

  static async deletePet(petId: string, userId: string) {
    // Check ownership
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { owner: true },
    });

    if (!pet) {
      throw new AppError('Pet not found', 404);
    }

    if (pet.owner.userId !== userId) {
      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || user.role !== 'admin') {
        throw new AppError('Not authorized to delete this pet', 403);
      }
    }

    await prisma.pet.delete({
      where: { id: petId },
    });

    return { message: 'Pet deleted successfully' };
  }

  static async addVaccinationRecords(petId: string, vaccinations: VaccinationInput[]) {
    const records = await Promise.all(
      vaccinations.map(async (vaccination) => {
        // Find or create vaccine type by name
        let vaccineType = await prisma.vaccineType.findFirst({
          where: { vaccineName: vaccination.vaccineName },
        });

        // If vaccine type doesn't exist, create it
        if (!vaccineType) {
          vaccineType = await prisma.vaccineType.create({
            data: {
              vaccineName: vaccination.vaccineName,
              speciesApplicability: [], // Will be updated as needed
              durationMonths: 12, // Default duration
              isRequiredByLaw: false, // Default to false
            },
          });
        }

        return prisma.vaccinationRecord.create({
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
      })
    );

    return records;
  }

  static async getPetVaccinations(petId: string, userId?: string) {
    // Check access
    if (userId) {
      await this.getPetById(petId, userId);
    }

    const vaccinations = await prisma.vaccinationRecord.findMany({
      where: { petId },
      include: {
        vaccineType: true,
      },
      orderBy: { administeredDate: 'desc' },
    });

    return vaccinations;
  }

  static async getSpeciesAndBreeds() {
    const species = await prisma.petSpecies.findMany({
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
    const vaccineTypes = await prisma.vaccineType.findMany({
      orderBy: { vaccineName: 'asc' },
    });

    return vaccineTypes;
  }

  static async recordPetLocation(
    petId: string,
    latitude: number,
    longitude: number,
    accuracy?: number,
    req?: any
  ) {
    // Verify pet exists
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
    });

    if (!pet) {
      throw new AppError('Pet not found', 404);
    }

    // Extract request metadata
    const scannerIp = req?.ip || req?.connection?.remoteAddress;
    const userAgent = req?.headers?.['user-agent'];

    // Create location event
    const locationEvent = await prisma.petLocationEvent.create({
      data: {
        petId,
        latitude,
        longitude,
        accuracy,
        scannerIp,
        userAgent,
        // deviceType: 'mobile', // Will be set by default in schema
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return locationEvent;
  }

  static async recordPublicPetLocation(
    petId: string,
    latitude: number,
    longitude: number,
    accuracy?: number,
    reporterInfo?: any,
    req?: any
  ) {
    // Verify pet exists
    const pet = await prisma.pet.findUnique({
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
      },
    });

    if (!pet) {
      throw new AppError('Pet not found', 404);
    }

    // Extract request metadata
    const scannerIp = req?.ip || req?.connection?.remoteAddress;
    const userAgent = req?.headers?.['user-agent'];

    // Create location event
    const locationEvent = await prisma.petLocationEvent.create({
      data: {
        petId,
        latitude,
        longitude,
        accuracy,
        scannerIp,
        userAgent,
        // Store reporter info in scannerContactInfo if provided
        scannerContactInfo: reporterInfo || null,
      },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    // Note: Notification creation temporarily disabled
    // TODO: Fix NotificationType enum and re-enable notifications

    return locationEvent;
  }

  static async getPetLocations(
    petId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    // Verify user has access to this pet
    const pet = await prisma.pet.findFirst({
      where: {
        id: petId,
        owner: {
          userId,
        },
      },
    });

    if (!pet) {
      throw new AppError('Pet not found or access denied', 404);
    }

    const skip = (page - 1) * limit;

    const [locations, totalCount] = await Promise.all([
      prisma.petLocationEvent.findMany({
        where: { petId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          latitude: true,
          longitude: true,
          accuracy: true,
          locationName: true,
          city: true,
          state: true,
          countryCode: true,
          createdAt: true,
        },
      }),
      prisma.petLocationEvent.count({
        where: { petId },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const meta: PaginationMeta = {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return {
      locations,
      meta,
    };
  }
}