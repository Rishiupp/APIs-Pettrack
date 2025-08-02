"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PetsController = void 0;
const pets_service_1 = require("../../services/pets/pets.service");
const response_1 = require("../../utils/response");
const validation_1 = require("../../utils/validation");
const error_handling_1 = require("../../middleware/error-handling");
const database_1 = __importDefault(require("../../config/database"));
class PetsController {
}
exports.PetsController = PetsController;
_a = PetsController;
PetsController.createPet = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const petData = req.body;
    const user = await database_1.default.user.findUnique({
        where: { id: userId },
        include: { petOwner: true },
    });
    if (!user?.petOwner) {
        return response_1.ResponseHandler.error(res, 'Pet owner profile not found', 400);
    }
    const errors = validation_1.ValidationUtil.validateRequired({
        name: petData.name,
        gender: petData.gender,
    });
    if (petData.birthDate) {
        const dateError = validation_1.ValidationUtil.validateDateNotFuture(petData.birthDate, 'birthDate');
        if (dateError)
            errors.push(dateError);
        const ageError = validation_1.ValidationUtil.validateAge(petData.birthDate);
        if (ageError)
            errors.push(ageError);
    }
    if (petData.weight && !validation_1.ValidationUtil.isValidWeight(petData.weight)) {
        errors.push({
            field: 'weight',
            message: 'Weight must be between 0 and 200 kg',
            value: petData.weight,
        });
    }
    if (petData.height && !validation_1.ValidationUtil.isValidHeight(petData.height)) {
        errors.push({
            field: 'height',
            message: 'Height must be between 0 and 200 cm',
            value: petData.height,
        });
    }
    if (petData.microchipId && !validation_1.ValidationUtil.isValidMicrochip(petData.microchipId)) {
        errors.push({
            field: 'microchipId',
            message: 'Invalid microchip ID format',
            value: petData.microchipId,
        });
    }
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const pet = await pets_service_1.PetsService.createPet(user.petOwner.id, petData);
    return response_1.ResponseHandler.created(res, pet, 'Pet created successfully');
});
PetsController.getPets = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { page, limit, status } = req.query;
    const { page: validPage, limit: validLimit, errors } = validation_1.ValidationUtil.validatePagination(page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const user = await database_1.default.user.findUnique({
        where: { id: userId },
        include: { petOwner: true },
    });
    if (!user?.petOwner) {
        return response_1.ResponseHandler.error(res, 'Pet owner profile not found', 400);
    }
    const result = await pets_service_1.PetsService.getPetsByOwner(user.petOwner.id, validPage, validLimit, status);
    return response_1.ResponseHandler.success(res, result.pets, undefined, 200, result.meta);
});
PetsController.getPetById = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { petId } = req.params;
    const userId = req.user.id;
    if (!petId) {
        return response_1.ResponseHandler.error(res, 'Pet ID is required', 400);
    }
    const pet = await pets_service_1.PetsService.getPetById(petId, userId);
    return response_1.ResponseHandler.success(res, pet);
});
PetsController.updatePet = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { petId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;
    const errors = [];
    if (updateData.birthDate) {
        const dateError = validation_1.ValidationUtil.validateDateNotFuture(updateData.birthDate, 'birthDate');
        if (dateError)
            errors.push(dateError);
        const ageError = validation_1.ValidationUtil.validateAge(updateData.birthDate);
        if (ageError)
            errors.push(ageError);
    }
    if (updateData.weight && !validation_1.ValidationUtil.isValidWeight(updateData.weight)) {
        errors.push({
            field: 'weight',
            message: 'Weight must be between 0 and 200 kg',
            value: updateData.weight,
        });
    }
    if (updateData.height && !validation_1.ValidationUtil.isValidHeight(updateData.height)) {
        errors.push({
            field: 'height',
            message: 'Height must be between 0 and 200 cm',
            value: updateData.height,
        });
    }
    if (updateData.microchipId && !validation_1.ValidationUtil.isValidMicrochip(updateData.microchipId)) {
        errors.push({
            field: 'microchipId',
            message: 'Invalid microchip ID format',
            value: updateData.microchipId,
        });
    }
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    if (!petId) {
        return response_1.ResponseHandler.error(res, 'Pet ID is required', 400);
    }
    const pet = await pets_service_1.PetsService.updatePet(petId, userId, updateData);
    return response_1.ResponseHandler.success(res, pet, 'Pet updated successfully');
});
PetsController.deletePet = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { petId } = req.params;
    const userId = req.user.id;
    if (!petId) {
        return response_1.ResponseHandler.error(res, 'Pet ID is required', 400);
    }
    await pets_service_1.PetsService.deletePet(petId, userId);
    return response_1.ResponseHandler.noContent(res);
});
PetsController.addVaccinations = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { petId } = req.params;
    const { vaccinations } = req.body;
    const userId = req.user.id;
    if (!petId) {
        return response_1.ResponseHandler.error(res, 'Pet ID is required', 400);
    }
    await pets_service_1.PetsService.getPetById(petId, userId);
    if (!Array.isArray(vaccinations) || vaccinations.length === 0) {
        return response_1.ResponseHandler.validationError(res, [{
                field: 'vaccinations',
                message: 'Vaccinations array is required',
            }]);
    }
    const errors = [];
    vaccinations.forEach((vaccination, index) => {
        if (!vaccination.vaccineTypeId) {
            errors.push({
                field: `vaccinations[${index}].vaccineTypeId`,
                message: 'Vaccine type ID is required',
            });
        }
        if (!vaccination.administeredDate) {
            errors.push({
                field: `vaccinations[${index}].administeredDate`,
                message: 'Administered date is required',
            });
        }
        else {
            const dateError = validation_1.ValidationUtil.validateDateNotFuture(vaccination.administeredDate, `vaccinations[${index}].administeredDate`);
            if (dateError)
                errors.push(dateError);
        }
    });
    if (errors.length > 0) {
        return response_1.ResponseHandler.validationError(res, errors);
    }
    const records = await pets_service_1.PetsService.addVaccinationRecords(petId, vaccinations);
    return response_1.ResponseHandler.created(res, records, 'Vaccination records added successfully');
});
PetsController.getVaccinations = (0, error_handling_1.asyncHandler)(async (req, res) => {
    const { petId } = req.params;
    const userId = req.user.id;
    if (!petId) {
        return response_1.ResponseHandler.error(res, 'Pet ID is required', 400);
    }
    const vaccinations = await pets_service_1.PetsService.getPetVaccinations(petId, userId);
    return response_1.ResponseHandler.success(res, vaccinations);
});
PetsController.getSpeciesAndBreeds = (0, error_handling_1.asyncHandler)(async (_req, res) => {
    const species = await pets_service_1.PetsService.getSpeciesAndBreeds();
    return response_1.ResponseHandler.success(res, species);
});
PetsController.getVaccineTypes = (0, error_handling_1.asyncHandler)(async (_req, res) => {
    const vaccineTypes = await pets_service_1.PetsService.getVaccineTypes();
    return response_1.ResponseHandler.success(res, vaccineTypes);
});
//# sourceMappingURL=pets.controller.js.map