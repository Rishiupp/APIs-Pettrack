import { TicketCategory, TicketPriority, TicketStatus, SenderType } from '@prisma/client';
import prisma from '../../config/database';
import { CryptoUtil } from '../../utils/crypto';
import { AppError } from '../../types';
import { CreateTicketRequest, TicketMessage } from '../../types';

export class SupportService {
  static async createTicket(userId: string, ticketData: CreateTicketRequest) {
    const { subject, description, category, priority, petId } = ticketData;

    // Validate pet ownership if petId provided
    if (petId) {
      const pet = await prisma.pet.findUnique({
        where: { id: petId },
        include: { owner: true },
      });

      if (!pet) {
        throw new AppError('Pet not found', 404);
      }

      // Check if user owns the pet or is admin/executive
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (pet.owner.userId !== userId && user?.role === 'pet_owner') {
        throw new AppError('Not authorized to create ticket for this pet', 403);
      }
    }

    // Generate ticket number
    const ticketNumber = CryptoUtil.generateTicketNumber();

    // Create ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        petId,
        subject,
        description,
        category: category as TicketCategory,
        priority: priority as TicketPriority,
        status: TicketStatus.open,
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

    // Create initial message
    await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: userId,
        senderType: SenderType.user,
        message: description,
      },
    });

    return ticket;
  }

  static async getUserTickets(
    userId: string,
    page: number = 1,
    limit: number = 25,
    status?: TicketStatus
  ) {
    const offset = (page - 1) * limit;
    const where = {
      userId,
      ...(status && { status }),
    };

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
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
      prisma.supportTicket.count({ where }),
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

  static async getTicketById(ticketId: string, userId: string) {
    const ticket = await prisma.supportTicket.findUnique({
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
      throw new AppError('Ticket not found', 404);
    }

    // Check access permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (ticket.userId !== userId && user?.role === 'pet_owner') {
      throw new AppError('Not authorized to view this ticket', 403);
    }

    return ticket;
  }

  static async addMessage(ticketId: string, userId: string, messageData: TicketMessage) {
    const { message, attachments = [] } = messageData;

    // Check if ticket exists and user has access
    const ticket = await this.getTicketById(ticketId, userId);

    // Determine sender type
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    let senderType: SenderType;
    if (user?.role === 'admin' || user?.role === 'executive') {
      senderType = SenderType.support;
    } else {
      senderType = SenderType.user;
    }

    // Create message
    const ticketMessage = await prisma.supportMessage.create({
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

    // Update ticket status if it was resolved and user is adding message
    if (ticket.status === TicketStatus.resolved && senderType === SenderType.user) {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.open },
      });
    }

    // If this is a support message and ticket was waiting for user, mark as in progress
    if (ticket.status === TicketStatus.waiting_user && senderType === SenderType.support) {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.in_progress },
      });
    }

    return ticketMessage;
  }

  static async updateTicketStatus(
    ticketId: string,
    userId: string,
    status: TicketStatus,
    resolution?: string
  ) {
    // Check if user has permission to update status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'pet_owner') {
      throw new AppError('Not authorized to update ticket status', 403);
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    const updateData: any = { status };

    if (status === TicketStatus.resolved && resolution) {
      updateData.resolution = resolution;
      updateData.resolvedAt = new Date();
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    return updatedTicket;
  }

  static async assignTicket(ticketId: string, assignedTo: string, assignedBy: string) {
    // Check if assignedBy user has permission
    const user = await prisma.user.findUnique({
      where: { id: assignedBy },
      select: { role: true },
    });

    if (user?.role === 'pet_owner') {
      throw new AppError('Not authorized to assign tickets', 403);
    }

    // Check if assignedTo user exists and has appropriate role
    const assignee = await prisma.user.findUnique({
      where: { id: assignedTo },
      select: { role: true },
    });

    if (!assignee || assignee.role === 'pet_owner') {
      throw new AppError('Invalid assignee', 400);
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedTo,
        status: TicketStatus.in_progress,
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

  static async getTicketStatistics(userId?: string) {
    const where = userId ? { userId } : {};

    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      ticketsByCategory,
      ticketsByPriority,
    ] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.open } }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.in_progress } }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.resolved } }),
      prisma.supportTicket.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
      prisma.supportTicket.groupBy({
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
      }, {} as Record<string, number>),
      byPriority: ticketsByPriority.reduce((acc, item) => {
        acc[item.priority] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // Admin methods
  static async getAllTickets(
    page: number = 1,
    limit: number = 25,
    filters: {
      status?: TicketStatus;
      category?: TicketCategory;
      priority?: TicketPriority;
      assignedTo?: string;
    } = {}
  ) {
    const offset = (page - 1) * limit;
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
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
      prisma.supportTicket.count({ where }),
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