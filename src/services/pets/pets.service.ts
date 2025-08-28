import { PetStatus, Gender } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../types';
import { PaginationMeta, PetRegistration, VaccinationInput } from '../../types';
import { CryptoUtil } from '../../utils/crypto';
import crypto from 'crypto';

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

    // Convert breed names to breed IDs
    let breedId = null;
    let secondaryBreedId = null;

    if (breed) {
      const breedRecord = await prisma.petBreed.findFirst({
        where: { breedName: breed },
      });
      breedId = breedRecord?.id || null;
    }

    if (secondaryBreed) {
      const secondaryBreedRecord = await prisma.petBreed.findFirst({
        where: { breedName: secondaryBreed },
      });
      secondaryBreedId = secondaryBreedRecord?.id || null;
    }

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
        breed_id: breedId,
        secondary_breed_id: secondaryBreedId,
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
        pet_breeds_pets_breed_idTopet_breeds: true,
        pet_breeds_pets_secondary_breed_idTopet_breeds: true,
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

    // Auto-generate QR Code (Option 1)
    const qrCode = await this.generateQRCodeForPet(pet);

    // Add vaccination records if provided
    if (vaccinations.length > 0) {
      await this.addVaccinationRecords(pet.id, vaccinations);
    }

    return {
      ...pet,
      qrCode
    };
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
          pet_breeds_pets_breed_idTopet_breeds: true,
          pet_breeds_pets_secondary_breed_idTopet_breeds: true,
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
        pet_breeds_pets_breed_idTopet_breeds: true,
        pet_breeds_pets_secondary_breed_idTopet_breeds: true,
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


    const updateFields: any = {};
    
    if (updateData.name) updateFields.name = updateData.name;
    if (updateData.speciesId) updateFields.speciesId = parseInt(updateData.speciesId.toString(), 10);
    
    // Handle breed updates
    if (updateData.breed !== undefined) {
      if (updateData.breed) {
        const breedRecord = await prisma.petBreed.findFirst({
          where: { breedName: updateData.breed },
        });
        updateFields.breed_id = breedRecord?.id || null;
      } else {
        updateFields.breed_id = null;
      }
    }
    
    if (updateData.secondaryBreed !== undefined) {
      if (updateData.secondaryBreed) {
        const secondaryBreedRecord = await prisma.petBreed.findFirst({
          where: { breedName: updateData.secondaryBreed },
        });
        updateFields.secondary_breed_id = secondaryBreedRecord?.id || null;
      } else {
        updateFields.secondary_breed_id = null;
      }
    }
    if (updateData.gender) updateFields.gender = updateData.gender as Gender;
    if (updateData.birthDate) updateFields.birthDate = new Date(updateData.birthDate);
    if (updateData.color !== undefined) updateFields.color = updateData.color;
    if (updateData.weight !== undefined) updateFields.weightKg = updateData.weight;
    if (updateData.height !== undefined) updateFields.heightCm = updateData.height;
    if (updateData.distinctiveMarks !== undefined) updateFields.distinctiveMarks = updateData.distinctiveMarks;
    if (updateData.isSpayedNeutered !== undefined) updateFields.isSpayedNeutered = updateData.isSpayedNeutered;
    if (updateData.specialNeeds !== undefined) updateFields.specialNeeds = updateData.specialNeeds;
    if (updateData.behavioralNotes !== undefined) updateFields.behavioralNotes = updateData.behavioralNotes;

    const updatedPet = await prisma.pet.update({
      where: { id: petId },
      data: updateFields,
      include: {
        species: true,
        pet_breeds_pets_breed_idTopet_breeds: true,
        pet_breeds_pets_secondary_breed_idTopet_breeds: true,
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

    // Get the QR code for this pet
    const qrCode = await prisma.qRCode.findFirst({
      where: { assignedToPet: petId },
    });

    // Extract request metadata
    const scannerIp = req?.ip || req?.connection?.remoteAddress;
    const userAgent = req?.headers?.['user-agent'];

    // Create QR scan event first (if QR code exists)
    let qrScanEvent = null;
    if (qrCode) {
      qrScanEvent = await prisma.qRScanEvent.create({
        data: {
          qrId: qrCode.id,
          petId: petId,
          scannerIp,
          userAgent,
          scanLocation: `POINT(${longitude} ${latitude})`,
          locationAccuracy: accuracy?.toString(),
          scanResult: 'success',
        },
      });
    }

    // Create location event
    const locationEvent = await prisma.petLocationEvent.create({
      data: {
        petId,
        latitude,
        longitude,
        accuracy,
        scannerIp,
        userAgent,
        qrScanId: qrScanEvent?.id || null,
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

    // Send notification to pet owner about location report
    if (pet.owner?.user) {
      try {
        const { NotificationService } = await import('../notifications/notification.service');
        
        // Create a mock scan event for the notification system
        const mockScanEvent = {
          id: qrScanEvent?.id || locationEvent.id,
          locationName: 'Unknown location',
          scanTimestamp: locationEvent.createdAt,
        };

        // Extract reporter info for the notification
        const reporterName = reporterInfo?.name || reporterInfo?.phone || 'Someone';
        
        await NotificationService.createNotification({
          userId: pet.owner.userId,
          petId: petId,
          qrScanId: qrScanEvent?.id,
          type: 'qr_scan',
          title: `${pet.name} was spotted!`,
          message: `${reporterName} reported ${pet.name}'s location`,
          channels: ['push', 'sms'],
          metadata: {
            latitude,
            longitude,
            accuracy,
            reporterInfo,
            timestamp: locationEvent.createdAt,
          },
        });
      } catch (error) {
        console.error('Failed to send location notification:', error);
      }
    }

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

  private static async generateQRCodeForPet(pet: any) {
    // Step A: Generate unique QR string using pet ID
    const qrCodeString = `PET_${pet.id.slice(0, 8).toUpperCase()}_${Date.now()}`;

    // Step B: Create pet data for QR code (same format as external QR)
    const qrData = {
      petId: pet.id,
      name: pet.name,
      species: pet.species?.speciesName || 'Unknown',
      breed: pet.pet_breeds_pets_breed_idTopet_breeds?.breedName || 'Mixed',
      gender: pet.gender,
      ownerName: `${pet.owner.user.firstName} ${pet.owner.user.lastName}`,
      ownerPhone: pet.owner.user.phone || '',
      imageUrl: pet.profileImageUrl || ''
    };

    // Step C: Create external QR URL (like current format)
    const encodedData = Buffer.from(JSON.stringify(qrData)).toString('base64');
    const subId = this.generateSubId();
    const externalQRUrl = `https://pet-trace-1-foundinglabs.replit.app/?data=${encodeURIComponent(encodedData)}&subid1=${subId}`;

    // Step D: Save QR Code record to database
    const qrCodeHash = CryptoUtil.hashQRCode(qrCodeString);
    const qrCode = await prisma.qRCode.create({
      data: {
        qrCodeString,
        qrCodeHash,
        assignedToPet: pet.id,
        status: 'active',
        assignedAt: new Date(),
        activatedAt: new Date()
      }
    });

    return {
      id: qrCode.id,
      qrCodeString: qrCode.qrCodeString,
      externalUrl: externalQRUrl,
      subId: subId,
      status: qrCode.status,
      assignedAt: qrCode.assignedAt
    };
  }

  private static generateSubId(): string {
    const date = new Date().toISOString().split('T')[0]?.replace(/-/g, '') || '';
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const formatted = `${date}-${randomBytes.slice(0, 4)}-${randomBytes.slice(4, 8)}-${randomBytes.slice(8, 12)}-${randomBytes.slice(12, 16)}`;
    return formatted;
  }
}