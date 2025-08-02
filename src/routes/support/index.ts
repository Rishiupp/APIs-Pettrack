import { Router } from 'express';
import { SupportController } from '../../controllers/support/support.controller';
import { authenticate } from '../../middleware/auth/authenticate';
import { requireAuthenticated, requireAdmin } from '../../middleware/auth/authorize';

const router = Router();

// All support routes require authentication
router.use(authenticate);

// User ticket operations
router.post('/tickets', requireAuthenticated, SupportController.createTicket);
router.get('/tickets', requireAuthenticated, SupportController.getUserTickets);
router.get('/tickets/:ticketId', requireAuthenticated, SupportController.getTicketById);
router.post('/tickets/:ticketId/messages', requireAuthenticated, SupportController.addMessage);

// Support staff operations (admin/executive only)
router.patch('/tickets/:ticketId/status', requireAdmin, SupportController.updateTicketStatus);
router.patch('/tickets/:ticketId/assign', requireAdmin, SupportController.assignTicket);

// Statistics
router.get('/statistics', requireAuthenticated, SupportController.getTicketStatistics);

// Admin operations
router.get('/admin/tickets', requireAdmin, SupportController.getAllTickets);

export default router;