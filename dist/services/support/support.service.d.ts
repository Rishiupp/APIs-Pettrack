import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { CreateTicketRequest, TicketMessage } from '../../types';
export declare class SupportService {
    static createTicket(userId: string, ticketData: CreateTicketRequest): Promise<{
        user: {
            email: string | null;
            phone: string | null;
            firstName: string;
            lastName: string;
        } | null;
        pet: {
            name: string;
            id: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        status: import(".prisma/client").$Enums.TicketStatus;
        petId: string | null;
        ticketNumber: string;
        subject: string;
        description: string;
        category: import(".prisma/client").$Enums.TicketCategory;
        priority: import(".prisma/client").$Enums.TicketPriority;
        assignedTo: string | null;
        resolution: string | null;
        resolvedAt: Date | null;
    }>;
    static getUserTickets(userId: string, page?: number, limit?: number, status?: TicketStatus): Promise<{
        tickets: ({
            pet: {
                name: string;
                id: string;
            } | null;
            assignedToUser: {
                firstName: string;
                lastName: string;
            } | null;
            messages: {
                message: string;
                createdAt: Date;
                senderType: import(".prisma/client").$Enums.SenderType;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            status: import(".prisma/client").$Enums.TicketStatus;
            petId: string | null;
            ticketNumber: string;
            subject: string;
            description: string;
            category: import(".prisma/client").$Enums.TicketCategory;
            priority: import(".prisma/client").$Enums.TicketPriority;
            assignedTo: string | null;
            resolution: string | null;
            resolvedAt: Date | null;
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
    static getTicketById(ticketId: string, userId: string): Promise<{
        user: {
            email: string | null;
            phone: string | null;
            firstName: string;
            lastName: string;
        } | null;
        pet: {
            name: string;
            id: string;
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
        } | null;
        assignedToUser: {
            email: string | null;
            firstName: string;
            lastName: string;
        } | null;
        messages: ({
            sender: {
                firstName: string;
                lastName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        } & {
            message: string;
            id: string;
            createdAt: Date;
            ticketId: string;
            senderId: string | null;
            senderType: import(".prisma/client").$Enums.SenderType;
            attachments: string[];
            isInternal: boolean;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        status: import(".prisma/client").$Enums.TicketStatus;
        petId: string | null;
        ticketNumber: string;
        subject: string;
        description: string;
        category: import(".prisma/client").$Enums.TicketCategory;
        priority: import(".prisma/client").$Enums.TicketPriority;
        assignedTo: string | null;
        resolution: string | null;
        resolvedAt: Date | null;
    }>;
    static addMessage(ticketId: string, userId: string, messageData: TicketMessage): Promise<{
        sender: {
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
        } | null;
    } & {
        message: string;
        id: string;
        createdAt: Date;
        ticketId: string;
        senderId: string | null;
        senderType: import(".prisma/client").$Enums.SenderType;
        attachments: string[];
        isInternal: boolean;
    }>;
    static updateTicketStatus(ticketId: string, userId: string, status: TicketStatus, resolution?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        status: import(".prisma/client").$Enums.TicketStatus;
        petId: string | null;
        ticketNumber: string;
        subject: string;
        description: string;
        category: import(".prisma/client").$Enums.TicketCategory;
        priority: import(".prisma/client").$Enums.TicketPriority;
        assignedTo: string | null;
        resolution: string | null;
        resolvedAt: Date | null;
    }>;
    static assignTicket(ticketId: string, assignedTo: string, assignedBy: string): Promise<{
        assignedToUser: {
            email: string | null;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        status: import(".prisma/client").$Enums.TicketStatus;
        petId: string | null;
        ticketNumber: string;
        subject: string;
        description: string;
        category: import(".prisma/client").$Enums.TicketCategory;
        priority: import(".prisma/client").$Enums.TicketPriority;
        assignedTo: string | null;
        resolution: string | null;
        resolvedAt: Date | null;
    }>;
    static getTicketStatistics(userId?: string): Promise<{
        total: number;
        open: number;
        inProgress: number;
        resolved: number;
        byCategory: Record<string, number>;
        byPriority: Record<string, number>;
    }>;
    static getAllTickets(page?: number, limit?: number, filters?: {
        status?: TicketStatus;
        category?: TicketCategory;
        priority?: TicketPriority;
        assignedTo?: string;
    }): Promise<{
        tickets: ({
            user: {
                email: string | null;
                firstName: string;
                lastName: string;
            } | null;
            pet: {
                name: string;
                id: string;
            } | null;
            assignedToUser: {
                firstName: string;
                lastName: string;
            } | null;
            messages: {
                message: string;
                createdAt: Date;
                senderType: import(".prisma/client").$Enums.SenderType;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            status: import(".prisma/client").$Enums.TicketStatus;
            petId: string | null;
            ticketNumber: string;
            subject: string;
            description: string;
            category: import(".prisma/client").$Enums.TicketCategory;
            priority: import(".prisma/client").$Enums.TicketPriority;
            assignedTo: string | null;
            resolution: string | null;
            resolvedAt: Date | null;
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
}
//# sourceMappingURL=support.service.d.ts.map