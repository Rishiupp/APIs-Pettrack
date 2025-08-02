import { Request, Response } from 'express';
import { SupportService } from '../../services/support/support.service';
import { ResponseHandler } from '../../utils/response';
import { ValidationUtil } from '../../utils/validation';
import { AuthRequest } from '../../types';
import { asyncHandler } from '../../middleware/error-handling';

export class SupportController {
  static createTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { subject, description, category, priority, petId } = req.body;

    // Validate input
    const errors = ValidationUtil.validateRequired({
      subject,
      description,
      category,
      priority,
    });

    const validCategories = ['technical', 'billing', 'pet_related', 'general'];
    if (!validCategories.includes(category)) {
      errors.push({
        field: 'category',
        message: 'Invalid category',
        value: category,
      });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      errors.push({
        field: 'priority',
        message: 'Invalid priority',
        value: priority,
      });
    }

    if (subject.length > 255) {
      errors.push({
        field: 'subject',
        message: 'Subject must be less than 255 characters',
        value: subject,
      });
    }

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const ticket = await SupportService.createTicket(userId, {
      subject: ValidationUtil.sanitizeString(subject),
      description: ValidationUtil.sanitizeString(description),
      category,
      priority,
      petId,
    });

    return ResponseHandler.created(res, ticket, 'Support ticket created successfully');
  });

  static getUserTickets = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { page, limit, status } = req.query;

    const { page: validPage, limit: validLimit, errors } = ValidationUtil.validatePagination(
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
      if (!validStatuses.includes(status as string)) {
        return ResponseHandler.validationError(res, [{
          field: 'status',
          message: 'Invalid status',
          value: status,
        }]);
      }
    }

    const result = await SupportService.getUserTickets(
      userId,
      validPage,
      validLimit,
      status as any
    );

    return ResponseHandler.success(res, result.tickets, undefined, 200, result.meta);
  });

  static getTicketById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ticketId } = req.params;
    const userId = req.user!.id;

    if (!ticketId) {
      return ResponseHandler.error(res, 'Ticket ID is required', 400);
    }

    const ticket = await SupportService.getTicketById(ticketId, userId);
    return ResponseHandler.success(res, ticket);
  });

  static addMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ticketId } = req.params;
    const userId = req.user!.id;
    const { message, attachments } = req.body;

    // Validate input
    const errors = ValidationUtil.validateRequired({ message });

    if (message.trim().length === 0) {
      errors.push({
        field: 'message',
        message: 'Message cannot be empty',
        value: message,
      });
    }

    if (attachments && !Array.isArray(attachments)) {
      errors.push({
        field: 'attachments',
        message: 'Attachments must be an array',
        value: attachments,
      });
    }

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    if (!ticketId) {
      return ResponseHandler.error(res, 'Ticket ID is required', 400);
    }

    const ticketMessage = await SupportService.addMessage(ticketId, userId, {
      message: ValidationUtil.sanitizeString(message),
      attachments,
    });

    return ResponseHandler.created(res, ticketMessage, 'Message added successfully');
  });

  static updateTicketStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ticketId } = req.params;
    const userId = req.user!.id;
    const { status, resolution } = req.body;

    // Validate status
    const validStatuses = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return ResponseHandler.validationError(res, [{
        field: 'status',
        message: 'Invalid status',
        value: status,
      }]);
    }

    if (status === 'resolved' && !resolution) {
      return ResponseHandler.validationError(res, [{
        field: 'resolution',
        message: 'Resolution is required when marking ticket as resolved',
      }]);
    }

    if (!ticketId) {
      return ResponseHandler.error(res, 'Ticket ID is required', 400);
    }

    const ticket = await SupportService.updateTicketStatus(
      ticketId,
      userId,
      status,
      resolution ? ValidationUtil.sanitizeString(resolution) : undefined
    );

    return ResponseHandler.success(res, ticket, 'Ticket status updated successfully');
  });

  static assignTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ticketId } = req.params;
    const { assignedTo } = req.body;
    const userId = req.user!.id;

    // Validate input
    const errors = ValidationUtil.validateRequired({ assignedTo });

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    if (!ticketId) {
      return ResponseHandler.error(res, 'Ticket ID is required', 400);
    }

    const ticket = await SupportService.assignTicket(ticketId, assignedTo, userId);
    return ResponseHandler.success(res, ticket, 'Ticket assigned successfully');
  });

  static getTicketStatistics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.role === 'pet_owner' ? req.user!.id : undefined;

    const statistics = await SupportService.getTicketStatistics(userId);
    return ResponseHandler.success(res, statistics);
  });

  // Admin only methods
  static getAllTickets = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, status, category, priority, assignedTo } = req.query;

    const { page: validPage, limit: validLimit, errors } = ValidationUtil.validatePagination(
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    // Validate filters
    const filters: any = {};
    if (status) {
      const validStatuses = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
      if (!validStatuses.includes(status as string)) {
        return ResponseHandler.validationError(res, [{
          field: 'status',
          message: 'Invalid status',
          value: status,
        }]);
      }
      filters.status = status;
    }

    if (category) {
      const validCategories = ['technical', 'billing', 'pet_related', 'general'];
      if (!validCategories.includes(category as string)) {
        return ResponseHandler.validationError(res, [{
          field: 'category',
          message: 'Invalid category',
          value: category,
        }]);
      }
      filters.category = category;
    }

    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority as string)) {
        return ResponseHandler.validationError(res, [{
          field: 'priority',
          message: 'Invalid priority',
          value: priority,
        }]);
      }
      filters.priority = priority;
    }

    if (assignedTo) {
      filters.assignedTo = assignedTo;
    }

    const result = await SupportService.getAllTickets(validPage, validLimit, filters);
    return ResponseHandler.success(res, result.tickets, undefined, 200, result.meta);
  });
}