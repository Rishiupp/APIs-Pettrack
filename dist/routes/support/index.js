"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const support_controller_1 = require("../../controllers/support/support.controller");
const authenticate_1 = require("../../middleware/auth/authenticate");
const authorize_1 = require("../../middleware/auth/authorize");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate);
router.post('/tickets', authorize_1.requireAuthenticated, support_controller_1.SupportController.createTicket);
router.get('/tickets', authorize_1.requireAuthenticated, support_controller_1.SupportController.getUserTickets);
router.get('/tickets/:ticketId', authorize_1.requireAuthenticated, support_controller_1.SupportController.getTicketById);
router.post('/tickets/:ticketId/messages', authorize_1.requireAuthenticated, support_controller_1.SupportController.addMessage);
router.patch('/tickets/:ticketId/status', authorize_1.requireAdmin, support_controller_1.SupportController.updateTicketStatus);
router.patch('/tickets/:ticketId/assign', authorize_1.requireAdmin, support_controller_1.SupportController.assignTicket);
router.get('/statistics', authorize_1.requireAuthenticated, support_controller_1.SupportController.getTicketStatistics);
router.get('/admin/tickets', authorize_1.requireAdmin, support_controller_1.SupportController.getAllTickets);
exports.default = router;
//# sourceMappingURL=index.js.map