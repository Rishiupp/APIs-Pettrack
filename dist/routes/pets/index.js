"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pets_controller_1 = require("../../controllers/pets/pets.controller");
const authenticate_1 = require("../../middleware/auth/authenticate");
const authorize_1 = require("../../middleware/auth/authorize");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate);
router.post('/', authorize_1.requireAuthenticated, pets_controller_1.PetsController.createPet);
router.get('/', authorize_1.requireAuthenticated, pets_controller_1.PetsController.getPets);
router.get('/species-breeds', pets_controller_1.PetsController.getSpeciesAndBreeds);
router.get('/vaccine-types', pets_controller_1.PetsController.getVaccineTypes);
router.get('/:petId', authorize_1.requireAuthenticated, pets_controller_1.PetsController.getPetById);
router.patch('/:petId', authorize_1.requireAuthenticated, pets_controller_1.PetsController.updatePet);
router.delete('/:petId', authorize_1.requireAuthenticated, pets_controller_1.PetsController.deletePet);
router.post('/:petId/vaccinations', authorize_1.requireAuthenticated, pets_controller_1.PetsController.addVaccinations);
router.get('/:petId/vaccinations', authorize_1.requireAuthenticated, pets_controller_1.PetsController.getVaccinations);
exports.default = router;
//# sourceMappingURL=index.js.map