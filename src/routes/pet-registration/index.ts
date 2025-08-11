import { Router } from 'express';
import { PetRegistrationController } from '../../controllers/pet-registration/pet-registration.controller';
import { authenticate } from '../../middleware/auth/authenticate';
import { requireAuthenticated } from '../../middleware/auth/authorize';

const router = Router();

// All pet registration routes require authentication
router.use(authenticate);

// Pet registration application routes
router.post('/', requireAuthenticated, PetRegistrationController.submitApplication);
router.get('/', requireAuthenticated, PetRegistrationController.getApplications);
router.get('/:applicationId', requireAuthenticated, PetRegistrationController.getApplicationById);

export default router;