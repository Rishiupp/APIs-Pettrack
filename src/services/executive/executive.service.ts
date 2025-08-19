import { UserRole, Gender, PaymentStatus } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../types';
import { ExecutiveRegistration, PetRegistration } from '../../types';
import { ValidationUtil } from '../../utils/validation';
import { PetsService } from '../pets/pets.service';

export class ExecutiveService {
  static async registerPetWithOwner(executiveId: string, registrationData: ExecutiveRegistration) {
    const { ownerDetails, petDetails, paymentMethod, amount } = registrationData;

    // Verify executive exists and is active
    const executive = await prisma.executive.findUnique({
      where: { userId: executiveId },
      include: { user: true },
    });

    if (!executive || !executive.isActive || !executive.user.isActive) {
      throw new AppError('Executive not found or inactive', 403);
    }

    // Start transaction for registration
    const result = await prisma.$transaction(async (tx) => {
      // Check if user already exists
      let user = await tx.user.findFirst({
        where: {
          OR: [
            { email: ownerDetails.email.toLowerCase() },
            { phone: ValidationUtil.sanitizePhone(ownerDetails.phone) },
          ],
        },
      });

      let petOwner;
      
      if (user) {
        // User exists, get or create pet owner profile
        petOwner = await tx.petOwner.findUnique({
          where: { userId: user.id },
        });

        if (!petOwner) {
          petOwner = await tx.petOwner.create({
            data: {
              userId: user.id,
              addressLine1: ownerDetails.address,
              city: ownerDetails.city,
              state: ownerDetails.state,
              postalCode: ownerDetails.postalCode,
              emergencyContactName: ownerDetails.emergencyContactName,
              emergencyContactPhone: ownerDetails.emergencyContactPhone,
            },
          });
        }
      } else {
        // Create new user
        user = await tx.user.create({
          data: {
            email: ownerDetails.email.toLowerCase(),
            phone: ValidationUtil.sanitizePhone(ownerDetails.phone),
            firstName: ValidationUtil.sanitizeString(ownerDetails.firstName),
            lastName: ValidationUtil.sanitizeString(ownerDetails.lastName),
            role: UserRole.pet_owner,
            isActive: true,
            emailVerified: false,
            phoneVerified: true, // Assume verified during executive registration
          },
        });

        // Create pet owner profile
        petOwner = await tx.petOwner.create({
          data: {
            userId: user.id,
            addressLine1: ownerDetails.address,
            city: ownerDetails.city,
            state: ownerDetails.state,
            postalCode: ownerDetails.postalCode,
            emergencyContactName: ownerDetails.emergencyContactName,
            emergencyContactPhone: ownerDetails.emergencyContactPhone,
          },
        });
      }

      // Convert breed names to breed IDs
      let breedId = null;
      let secondaryBreedId = null;

      if (petDetails.breed) {
        const breedRecord = await tx.petBreed.findFirst({
          where: { breedName: petDetails.breed },
        });
        breedId = breedRecord?.id || null;
      }

      if (petDetails.secondaryBreed) {
        const secondaryBreedRecord = await tx.petBreed.findFirst({
          where: { breedName: petDetails.secondaryBreed },
        });
        secondaryBreedId = secondaryBreedRecord?.id || null;
      }

      // Create pet
      const pet = await tx.pet.create({
        data: {
          ownerId: petOwner.id,
          registeredBy: executiveId,
          name: ValidationUtil.sanitizeString(petDetails.name),
          speciesId: petDetails.speciesId,
          breed_id: breedId,
          secondary_breed_id: secondaryBreedId,
          gender: petDetails.gender as Gender,
          birthDate: petDetails.birthDate ? new Date(petDetails.birthDate) : null,
          color: petDetails.color,
          weightKg: petDetails.weight,
          heightCm: petDetails.height,
          distinctiveMarks: petDetails.distinctiveMarks,
          isSpayedNeutered: petDetails.isSpayedNeutered,
          specialNeeds: petDetails.specialNeeds,
          behavioralNotes: petDetails.behavioralNotes,
        },
        include: {
          species: true,
          pet_breeds_pets_breed_idTopet_breeds: true,
          pet_breeds_pets_secondary_breed_idTopet_breeds: true,
        },
      });

      // Record payment if provided
      let paymentEvent;
      if (paymentMethod && amount) {
        paymentEvent = await tx.paymentEvent.create({
          data: {
            userId: user.id,
            petId: pet.id,
            amount,
            currency: 'INR',
            paymentPurpose: 'qr_registration',
            status: paymentMethod === 'cash' ? PaymentStatus.success : PaymentStatus.initiated,
            paymentMethod,
            completedAt: paymentMethod === 'cash' ? new Date() : null,
          },
        });

        // If cash payment, assign QR code immediately
        if (paymentMethod === 'cash') {
          const availableQR = await tx.qRCode.findFirst({
            where: { status: 'available' },
            orderBy: { createdAt: 'asc' },
          });

          if (availableQR) {
            await tx.qRCode.update({
              where: { id: availableQR.id },
              data: {
                status: 'assigned',
                assignedToPet: pet.id,
                assignedAt: new Date(),
              },
            });

            // Update payment event with QR ID
            await tx.paymentEvent.update({
              where: { id: paymentEvent.id },
              data: { qrId: availableQR.id },
            });
          }
        }
      }

      return {
        user,
        petOwner,
        pet,
        paymentEvent,
      };
    });

    return result;
  }

  static async getRegistrationHistory(
    executiveId: string,
    page: number = 1,
    limit: number = 25,
    from?: string
  ) {
    const offset = (page - 1) * limit;
    const where: any = { registeredBy: executiveId };

    if (from) {
      where.createdAt = { gte: new Date(from) };
    }

    const [registrations, total] = await Promise.all([
      prisma.pet.findMany({
        where,
        include: {
          owner: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
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
            },
          },
          paymentEvents: {
            select: {
              id: true,
              amount: true,
              status: true,
              paymentMethod: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.pet.count({ where }),
    ]);

    const meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };

    return { registrations, meta };
  }

  static async getExecutiveStats(executiveId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalRegistrations,
      registrationsThisMonth,
      registrationsToday,
      totalRevenue,
      revenueThisMonth,
    ] = await Promise.all([
      prisma.pet.count({
        where: { registeredBy: executiveId },
      }),
      prisma.pet.count({
        where: {
          registeredBy: executiveId,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.pet.count({
        where: {
          registeredBy: executiveId,
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.paymentEvent.aggregate({
        where: {
          pet: { registeredBy: executiveId },
          status: PaymentStatus.success,
        },
        _sum: { amount: true },
      }),
      prisma.paymentEvent.aggregate({
        where: {
          pet: { registeredBy: executiveId },
          status: PaymentStatus.success,
          completedAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      registrations: {
        total: totalRegistrations,
        thisMonth: registrationsThisMonth,
        today: registrationsToday,
      },
      revenue: {
        total: Number(totalRevenue._sum.amount) || 0,
        thisMonth: Number(revenueThisMonth._sum.amount) || 0,
      },
    };
  }

  static async updateExecutiveProfile(executiveId: string, updateData: {
    territory?: string;
  }) {
    const executive = await prisma.executive.findUnique({
      where: { userId: executiveId },
    });

    if (!executive) {
      throw new AppError('Executive profile not found', 404);
    }

    const updatedExecutive = await prisma.executive.update({
      where: { userId: executiveId },
      data: {
        ...(updateData.territory && { territory: updateData.territory }),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return updatedExecutive;
  }

  static async getExecutiveProfile(executiveId: string) {
    const executive = await prisma.executive.findUnique({
      where: { userId: executiveId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
    });

    if (!executive) {
      throw new AppError('Executive profile not found', 404);
    }

    return executive;
  }

  static async getDailyRegistrationReport(executiveId: string, date: string) {
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const registrations = await prisma.pet.findMany({
      where: {
        registeredBy: executiveId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        owner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        species: true,
        paymentEvents: {
          select: {
            amount: true,
            status: true,
            paymentMethod: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const summary = {
      totalRegistrations: registrations.length,
      totalRevenue: registrations.reduce((sum, reg) => {
        const payment = reg.paymentEvents[0];
        return sum + (payment?.status === 'success' ? Number(payment.amount) : 0);
      }, 0),
      bySpecies: {} as Record<string, number>,
      byPaymentMethod: {} as Record<string, number>,
    };

    registrations.forEach(registration => {
      const speciesName = registration.species?.speciesName || 'Unknown';
      const paymentMethod = registration.paymentEvents[0]?.paymentMethod || 'none';

      summary.bySpecies[speciesName] = (summary.bySpecies[speciesName] || 0) + 1;
      summary.byPaymentMethod[paymentMethod] = (summary.byPaymentMethod[paymentMethod] || 0) + 1;
    });

    return {
      date,
      registrations,
      summary,
    };
  }

  // Admin methods for executive management
  static async getAllExecutives(page: number = 1, limit: number = 25) {
    const offset = (page - 1) * limit;

    const [executives, total] = await Promise.all([
      prisma.executive.findMany({
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.executive.count(),
    ]);

    const meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };

    return { executives, meta };
  }

  static async createExecutive(userData: {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    territory?: string;
  }) {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email.toLowerCase() },
          { phone: ValidationUtil.sanitizePhone(userData.phone) },
        ],
      },
    });

    if (existingUser) {
      throw new AppError('User already exists with this email or phone', 409);
    }

    // Check if employee ID is unique
    const existingExecutive = await prisma.executive.findUnique({
      where: { employeeId: userData.employeeId },
    });

    if (existingExecutive) {
      throw new AppError('Employee ID already exists', 409);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: userData.email.toLowerCase(),
          phone: ValidationUtil.sanitizePhone(userData.phone),
          firstName: ValidationUtil.sanitizeString(userData.firstName),
          lastName: ValidationUtil.sanitizeString(userData.lastName),
          role: UserRole.executive,
          isActive: true,
          emailVerified: false,
          phoneVerified: false,
        },
      });

      // Create executive profile
      const executive = await tx.executive.create({
        data: {
          userId: user.id,
          employeeId: userData.employeeId,
          territory: userData.territory,
          isActive: true,
        },
      });

      return { user, executive };
    });

    return result;
  }

  static async deactivateExecutive(executiveId: string) {
    const executive = await prisma.executive.findUnique({
      where: { userId: executiveId },
    });

    if (!executive) {
      throw new AppError('Executive not found', 404);
    }

    await prisma.$transaction([
      prisma.executive.update({
        where: { userId: executiveId },
        data: { isActive: false },
      }),
      prisma.user.update({
        where: { id: executiveId },
        data: { isActive: false },
      }),
    ]);

    return { message: 'Executive deactivated successfully' };
  }
}