import { Router } from 'express';
import { PetsController } from '../../controllers/pets/pets.controller';
import { authenticate } from '../../middleware/auth/authenticate';
import { requireAuthenticated } from '../../middleware/auth/authorize';

const router = Router();

// Public routes (no authentication required)
router.post('/:petId/public-location', PetsController.recordPublicPetLocation);
router.get('/species-breeds', PetsController.getSpeciesAndBreeds);
router.get('/vaccine-types', PetsController.getVaccineTypes);

// All other pet routes require authentication
router.use(authenticate);

// Pet CRUD operations
router.post('/', requireAuthenticated, PetsController.createPet);
router.get('/', requireAuthenticated, PetsController.getPets);
router.get('/:petId', requireAuthenticated, PetsController.getPetById);
router.patch('/:petId', requireAuthenticated, PetsController.updatePet);
router.delete('/:petId', requireAuthenticated, PetsController.deletePet);

// Vaccination management
router.post('/:petId/vaccinations', requireAuthenticated, PetsController.addVaccinations);
router.get('/:petId/vaccinations', requireAuthenticated, PetsController.getVaccinations);

// Location tracking
router.post('/:petId/location', PetsController.recordPetLocation);
router.get('/:petId/locations', requireAuthenticated, PetsController.getPetLocations);

export default router;