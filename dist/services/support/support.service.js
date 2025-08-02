"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportService = void 0;
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const crypto_1 = require("../../utils/crypto");
const types_1 = require("../../types");
class SupportService {
    static async createTicket(userId, ticketData) {
        const { subject, description, category, priority, petId } = ticketData;
        if (petId) {
            const pet = await database_1.default.pet.findUnique({
                where: { id: petId },
                include: { owner: true },
            });
            if (!pet) {
                throw new types_1.AppError('Pet not found', 404);
            }
            const user = await database_1.default.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });
            if (pet.owner.userId !== userId && user?.role === 'pet_owner') {
                throw new types_1.AppError('Not authorized to create ticket for this pet', 403);
            }
        }
        const ticketNumber = crypto_1.CryptoUtil.generateTicketNumber();
        const ticket = await database_1.default.supportTicket.create({
            data: {
                ticketNumber,
                userId,
                petId,
                subject,
                description,
                category: category,
                priority: priority,
                status: client_1.TicketStatus.open,
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
                pet: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        await database_1.default.supportMessage.create({
            data: {
                ticketId: ticket.id,
                senderId: userId,
                senderType: client_1.SenderType.user,
                message: description,
            },
        });
        return ticket;
    }
    static async getUserTickets(userId, page = 1, limit = 25, status) {
        const offset = (page - 1) * limit;
        const where = {
            userId,
            ...(status && { status }),
        };
        const [tickets, total] = await Promise.all([
            database_1.default.supportTicket.findMany({
                where,
                include: {
                    pet: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    assignedToUser: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: {
                            message: true,
                            createdAt: true,
                            senderType: true,
                        },
                    },
                },
                orderBy: [
                    { status: 'asc' },
                    { priority: 'desc' },
                    { createdAt: 'desc' },
                ],
                skip: offset,
                take: limit,
            }),
            database_1.default.supportTicket.count({ where }),
        ]);
        const meta = {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        };
        return { tickets, meta };
    }
    static async getTicketById(ticketId, userId) {
        const ticket = await database_1.default.supportTicket.findUnique({
            where: { id: ticketId },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                pet: {
                    select: {
                        id: true,
                        name: true,
                        species: true,
                        breed: true,
                    },
                },
                assignedToUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                messages: {
                    include: {
                        sender: {
                            select: {
                                firstName: true,
                                lastName: true,
                                role: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!ticket) {
            throw new types_1.AppError('Ticket not found', 404);
        }
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        if (ticket.userId !== userId && user?.role === 'pet_owner') {
            throw new types_1.AppError('Not authorized to view this ticket', 403);
        }
        return ticket;
    }
    static async addMessage(ticketId, userId, messageData) {
        const { message, attachments = [] } = messageData;
        const ticket = await this.getTicketById(ticketId, userId);
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        let senderType;
        if (user?.role === 'admin' || user?.role === 'executive') {
            senderType = client_1.SenderType.support;
        }
        else {
            senderType = client_1.SenderType.user;
        }
        const ticketMessage = await database_1.default.supportMessage.create({
            data: {
                ticketId,
                senderId: userId,
                senderType,
                message,
                attachments,
            },
            include: {
                sender: {
                    select: {
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                },
            },
        });
        if (ticket.status === client_1.TicketStatus.resolved && senderType === client_1.SenderType.user) {
            await database_1.default.supportTicket.update({
                where: { id: ticketId },
                data: { status: client_1.TicketStatus.open },
            });
        }
        if (ticket.status === client_1.TicketStatus.waiting_user && senderType === client_1.SenderType.support) {
            await database_1.default.supportTicket.update({
                where: { id: ticketId },
                data: { status: client_1.TicketStatus.in_progress },
            });
        }
        return ticketMessage;
    }
    static async updateTicketStatus(ticketId, userId, status, resolution) {
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        if (user?.role === 'pet_owner') {
            throw new types_1.AppError('Not authorized to update ticket status', 403);
        }
        const ticket = await database_1.default.supportTicket.findUnique({
            where: { id: ticketId },
        });
        if (!ticket) {
            throw new types_1.AppError('Ticket not found', 404);
        }
        const updateData = { status };
        if (status === client_1.TicketStatus.resolved && resolution) {
            updateData.resolution = resolution;
            updateData.resolvedAt = new Date();
        }
        const updatedTicket = await database_1.default.supportTicket.update({
            where: { id: ticketId },
            data: updateData,
        });
        return updatedTicket;
    }
    static async assignTicket(ticketId, assignedTo, assignedBy) {
        const user = await database_1.default.user.findUnique({
            where: { id: assignedBy },
            select: { role: true },
        });
        if (user?.role === 'pet_owner') {
            throw new types_1.AppError('Not authorized to assign tickets', 403);
        }
        const assignee = await database_1.default.user.findUnique({
            where: { id: assignedTo },
            select: { role: true },
        });
        if (!assignee || assignee.role === 'pet_owner') {
            throw new types_1.AppError('Invalid assignee', 400);
        }
        const updatedTicket = await database_1.default.supportTicket.update({
            where: { id: ticketId },
            data: {
                assignedTo,
                status: client_1.TicketStatus.in_progress,
            },
            include: {
                assignedToUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        return updatedTicket;
    }
    static async getTicketStatistics(userId) {
        const where = userId ? { userId } : {};
        const [totalTickets, openTickets, inProgressTickets, resolvedTickets, ticketsByCategory, ticketsByPriority,] = await Promise.all([
            database_1.default.supportTicket.count({ where }),
            database_1.default.supportTicket.count({ where: { ...where, status: client_1.TicketStatus.open } }),
            database_1.default.supportTicket.count({ where: { ...where, status: client_1.TicketStatus.in_progress } }),
            database_1.default.supportTicket.count({ where: { ...where, status: client_1.TicketStatus.resolved } }),
            database_1.default.supportTicket.groupBy({
                by: ['category'],
                where,
                _count: true,
            }),
            database_1.default.supportTicket.groupBy({
                by: ['priority'],
                where,
                _count: true,
            }),
        ]);
        return {
            total: totalTickets,
            open: openTickets,
            inProgress: inProgressTickets,
            resolved: resolvedTickets,
            byCategory: ticketsByCategory.reduce((acc, item) => {
                acc[item.category] = item._count;
                return acc;
            }, {}),
            byPriority: ticketsByPriority.reduce((acc, item) => {
                acc[item.priority] = item._count;
                return acc;
            }, {}),
        };
    }
    static async getAllTickets(page = 1, limit = 25, filters = {}) {
        const offset = (page - 1) * limit;
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.category)
            where.category = filters.category;
        if (filters.priority)
            where.priority = filters.priority;
        if (filters.assignedTo)
            where.assignedTo = filters.assignedTo;
        const [tickets, total] = await Promise.all([
            database_1.default.supportTicket.findMany({
                where,
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    pet: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    assignedToUser: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: {
                            message: true,
                            createdAt: true,
                            senderType: true,
                        },
                    },
                },
                orderBy: [
                    { priority: 'desc' },
                    { status: 'asc' },
                    { createdAt: 'desc' },
                ],
                skip: offset,
                take: limit,
            }),
            database_1.default.supportTicket.count({ where }),
        ]);
        const meta = {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        };
        return { tickets, meta };
    }
}
exports.SupportService = SupportService;
//# sourceMappingURL=support.service.js.map