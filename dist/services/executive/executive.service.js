"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutiveService = void 0;
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const types_1 = require("../../types");
const validation_1 = require("../../utils/validation");
class ExecutiveService {
    static async registerPetWithOwner(executiveId, registrationData) {
        const { ownerDetails, petDetails, paymentMethod, amount } = registrationData;
        const executive = await database_1.default.executive.findUnique({
            where: { userId: executiveId },
            include: { user: true },
        });
        if (!executive || !executive.isActive || !executive.user.isActive) {
            throw new types_1.AppError('Executive not found or inactive', 403);
        }
        const result = await database_1.default.$transaction(async (tx) => {
            let user = await tx.user.findFirst({
                where: {
                    OR: [
                        { email: ownerDetails.email.toLowerCase() },
                        { phone: validation_1.ValidationUtil.sanitizePhone(ownerDetails.phone) },
                    ],
                },
            });
            let petOwner;
            if (user) {
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
            }
            else {
                user = await tx.user.create({
                    data: {
                        email: ownerDetails.email.toLowerCase(),
                        phone: validation_1.ValidationUtil.sanitizePhone(ownerDetails.phone),
                        firstName: validation_1.ValidationUtil.sanitizeString(ownerDetails.firstName),
                        lastName: validation_1.ValidationUtil.sanitizeString(ownerDetails.lastName),
                        role: client_1.UserRole.pet_owner,
                        isActive: true,
                        emailVerified: false,
                        phoneVerified: true,
                    },
                });
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
            const pet = await tx.pet.create({
                data: {
                    ownerId: petOwner.id,
                    registeredBy: executiveId,
                    name: validation_1.ValidationUtil.sanitizeString(petDetails.name),
                    speciesId: petDetails.speciesId,
                    breedId: petDetails.breedId,
                    secondaryBreedId: petDetails.secondaryBreedId,
                    gender: petDetails.gender,
                    birthDate: petDetails.birthDate ? new Date(petDetails.birthDate) : null,
                    color: petDetails.color,
                    weightKg: petDetails.weight,
                    heightCm: petDetails.height,
                    distinctiveMarks: petDetails.distinctiveMarks,
                    isSpayedNeutered: petDetails.isSpayedNeutered,
                    microchipId: petDetails.microchipId,
                    specialNeeds: petDetails.specialNeeds,
                    behavioralNotes: petDetails.behavioralNotes,
                },
                include: {
                    species: true,
                    breed: true,
                    secondaryBreed: true,
                },
            });
            let paymentEvent;
            if (paymentMethod && amount) {
                paymentEvent = await tx.paymentEvent.create({
                    data: {
                        userId: user.id,
                        petId: pet.id,
                        amount,
                        currency: 'INR',
                        paymentPurpose: 'qr_registration',
                        status: paymentMethod === 'cash' ? client_1.PaymentStatus.success : client_1.PaymentStatus.initiated,
                        paymentMethod,
                        completedAt: paymentMethod === 'cash' ? new Date() : null,
                    },
                });
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
    static async getRegistrationHistory(executiveId, page = 1, limit = 25, from) {
        const offset = (page - 1) * limit;
        const where = { registeredBy: executiveId };
        if (from) {
            where.createdAt = { gte: new Date(from) };
        }
        const [registrations, total] = await Promise.all([
            database_1.default.pet.findMany({
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
                    breed: true,
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
        return { registrations, meta };
    }
    static async getExecutiveStats(executiveId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const [totalRegistrations, registrationsThisMonth, registrationsToday, totalRevenue, revenueThisMonth,] = await Promise.all([
            database_1.default.pet.count({
                where: { registeredBy: executiveId },
            }),
            database_1.default.pet.count({
                where: {
                    registeredBy: executiveId,
                    createdAt: { gte: startOfMonth },
                },
            }),
            database_1.default.pet.count({
                where: {
                    registeredBy: executiveId,
                    createdAt: { gte: startOfToday },
                },
            }),
            database_1.default.paymentEvent.aggregate({
                where: {
                    pet: { registeredBy: executiveId },
                    status: client_1.PaymentStatus.success,
                },
                _sum: { amount: true },
            }),
            database_1.default.paymentEvent.aggregate({
                where: {
                    pet: { registeredBy: executiveId },
                    status: client_1.PaymentStatus.success,
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
    static async updateExecutiveProfile(executiveId, updateData) {
        const executive = await database_1.default.executive.findUnique({
            where: { userId: executiveId },
        });
        if (!executive) {
            throw new types_1.AppError('Executive profile not found', 404);
        }
        const updatedExecutive = await database_1.default.executive.update({
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
    static async getExecutiveProfile(executiveId) {
        const executive = await database_1.default.executive.findUnique({
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
            throw new types_1.AppError('Executive profile not found', 404);
        }
        return executive;
    }
    static async getDailyRegistrationReport(executiveId, date) {
        const startDate = new Date(date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        const registrations = await database_1.default.pet.findMany({
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
                breed: true,
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
            bySpecies: {},
            byPaymentMethod: {},
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
    static async getAllExecutives(page = 1, limit = 25) {
        const offset = (page - 1) * limit;
        const [executives, total] = await Promise.all([
            database_1.default.executive.findMany({
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
            database_1.default.executive.count(),
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
    static async createExecutive(userData) {
        const existingUser = await database_1.default.user.findFirst({
            where: {
                OR: [
                    { email: userData.email.toLowerCase() },
                    { phone: validation_1.ValidationUtil.sanitizePhone(userData.phone) },
                ],
            },
        });
        if (existingUser) {
            throw new types_1.AppError('User already exists with this email or phone', 409);
        }
        const existingExecutive = await database_1.default.executive.findUnique({
            where: { employeeId: userData.employeeId },
        });
        if (existingExecutive) {
            throw new types_1.AppError('Employee ID already exists', 409);
        }
        const result = await database_1.default.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: userData.email.toLowerCase(),
                    phone: validation_1.ValidationUtil.sanitizePhone(userData.phone),
                    firstName: validation_1.ValidationUtil.sanitizeString(userData.firstName),
                    lastName: validation_1.ValidationUtil.sanitizeString(userData.lastName),
                    role: client_1.UserRole.executive,
                    isActive: true,
                    emailVerified: false,
                    phoneVerified: false,
                },
            });
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
    static async deactivateExecutive(executiveId) {
        const executive = await database_1.default.executive.findUnique({
            where: { userId: executiveId },
        });
        if (!executive) {
            throw new types_1.AppError('Executive not found', 404);
        }
        await database_1.default.$transaction([
            database_1.default.executive.update({
                where: { userId: executiveId },
                data: { isActive: false },
            }),
            database_1.default.user.update({
                where: { id: executiveId },
                data: { isActive: false },
            }),
        ]);
        return { message: 'Executive deactivated successfully' };
    }
}
exports.ExecutiveService = ExecutiveService;
//# sourceMappingURL=executive.service.js.map