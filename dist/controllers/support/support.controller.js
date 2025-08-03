"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportController = void 0;
const support_service_1 = require("../../services/support/support.service");
const response_1 = require("../../utils/response");
const validation_1 = require("../../utils/validation");
const error_handling_1 = require("../../middleware/error-handling");
class SupportController {
}
exports.SupportController = SupportController;
_a = SupportController;
SupportController.createTicket = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { subject, description, category, priority, petId } = req.body;
    const errors = validation_1.ValidationUtil.validateRequired({
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
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const ticket = await support_service_1.SupportService.createTicket(userId, {
        subject: validation_1.ValidationUtil.sanitizeString(subject),
        description: validation_1.ValidationUtil.sanitizeString(description),
        category,
        priority,
        petId,
    });
    return response_1.ResponseHandler.created(res, ticket, 'Support ticket created successfully');
});
SupportController.getUserTickets = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { page, limit, status } = req.query;
    const { page: validPage, limit: validLimit, errors } = validation_1.ValidationUtil.validatePagination(page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    if (status) {
        const validStatuses = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
            return response_1.ResponseHandler.validationError(res, [{
                    field: 'status',
                    message: 'Invalid status',
                    value: status,
                }]);
        }
    }
    const result = await support_service_1.SupportService.getUserTickets(userId, validPage, validLimit, status);
    return response_1.ResponseHandler.success(res, result.tickets, undefined, 200, result.meta);
});
SupportController.getTicketById = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { ticketId } = req.params;
    const userId = req.user.id;
    if (!ticketId) {
        return response_1.ResponseHandler.error(res, 'Ticket ID is required', 400);
    }
    const ticket = await support_service_1.SupportService.getTicketById(ticketId, userId);
    return response_1.ResponseHandler.success(res, ticket);
});
SupportController.addMessage = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { ticketId } = req.params;
    const userId = req.user.id;
    const { message, attachments } = req.body;
    const errors = validation_1.ValidationUtil.validateRequired({ message });
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
        return response_1.ResponseHandler.validationError(res, errors);
    }
    if (!ticketId) {
        return response_1.ResponseHandler.error(res, 'Ticket ID is required', 400);
    }
    const ticketMessage = await support_service_1.SupportService.addMessage(ticketId, userId, {
        message: validation_1.ValidationUtil.sanitizeString(message),
        attachments,
    });
    return response_1.ResponseHandler.created(res, ticketMessage, 'Message added successfully');
});
SupportController.updateTicketStatus = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { ticketId } = req.params;
    const userId = req.user.id;
    const { status, resolution } = req.body;
    const validStatuses = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
        return response_1.ResponseHandler.validationError(res, [{
                field: 'status',
                message: 'Invalid status',
                value: status,
            }]);
    }
    if (status === 'resolved' && !resolution) {
        return response_1.ResponseHandler.validationError(res, [{
                field: 'resolution',
                message: 'Resolution is required when marking ticket as resolved',
            }]);
    }
    if (!ticketId) {
        return response_1.ResponseHandler.error(res, 'Ticket ID is required', 400);
    }
    const ticket = await support_service_1.SupportService.updateTicketStatus(ticketId, userId, status, resolution ? validation_1.ValidationUtil.sanitizeString(resolution) : undefined);
    return response_1.ResponseHandler.success(res, ticket, 'Ticket status updated successfully');
});
SupportController.assignTicket = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { ticketId } = req.params;
    const { assignedTo } = req.body;
    const userId = req.user.id;
    const errors = validation_1.ValidationUtil.validateRequired({ assignedTo });
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    if (!ticketId) {
        return response_1.ResponseHandler.error(res, 'Ticket ID is required', 400);
    }
    const ticket = await support_service_1.SupportService.assignTicket(ticketId, assignedTo, userId);
    return response_1.ResponseHandler.success(res, ticket, 'Ticket assigned successfully');
});
SupportController.getTicketStatistics = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.role === 'pet_owner' ? req.user.id : undefined;
    const statistics = await support_service_1.SupportService.getTicketStatistics(userId);
    return response_1.ResponseHandler.success(res, statistics);
});
SupportController.getAllTickets = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { page, limit, status, category, priority, assignedTo } = req.query;
    const { page: validPage, limit: validLimit, errors } = validation_1.ValidationUtil.validatePagination(page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const filters = {};
    if (status) {
        const validStatuses = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
            return response_1.ResponseHandler.validationError(res, [{
                    field: 'status',
                    message: 'Invalid status',
                    value: status,
                }]);
        }
        filters.status = status;
    }
    if (category) {
        const validCategories = ['technical', 'billing', 'pet_related', 'general'];
        if (!validCategories.includes(category)) {
            return response_1.ResponseHandler.validationError(res, [{
                    field: 'category',
                    message: 'Invalid category',
                    value: category,
                }]);
        }
        filters.category = category;
    }
    if (priority) {
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(priority)) {
            return response_1.ResponseHandler.validationError(res, [{
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
    const result = await support_service_1.SupportService.getAllTickets(validPage, validLimit, filters);
    return response_1.ResponseHandler.success(res, result.tickets, undefined, 200, result.meta);
});
//# sourceMappingURL=support.controller.js.map