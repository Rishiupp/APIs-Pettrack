import { Request, Response } from 'express';
import { PetsService } from '../../services/pets/pets.service';
import { ResponseHandler } from '../../utils/response';
import { ValidationUtil } from '../../utils/validation';
import { AuthRequest } from '../../types';
import { asyncHandler } from '../../middleware/error-handling';
import prisma from '../../config/database';

export class PetsController {
  static createPet = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const petData = req.body;

    // Get owner ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { petOwner: true },
    });

    if (!user?.petOwner) {
      return ResponseHandler.error(res, 'Pet owner profile not found', 400);
    }

    // Validate required fields
    const errors = ValidationUtil.validateRequired({
      name: petData.name,
      gender: petData.gender,
    });

    // Validate birth date if provided
    if (petData.birthDate) {
      const dateError = ValidationUtil.validateDateNotFuture(petData.birthDate, 'birthDate');
      if (dateError) errors.push(dateError);

      const ageError = ValidationUtil.validateAge(petData.birthDate);
      if (ageError) errors.push(ageError);
    }

    // Validate weight and height if provided
    if (petData.weight && !ValidationUtil.isValidWeight(petData.weight)) {
      errors.push({
        field: 'weight',
        message: 'Weight must be between 0 and 200 kg',
        value: petData.weight,
      });
    }

    if (petData.height && !ValidationUtil.isValidHeight(petData.height)) {
      errors.push({
        field: 'height',
        message: 'Height must be between 0 and 200 cm',
        value: petData.height,
      });
    }

    // Validate microchip if provided
    if (petData.microchipId && !ValidationUtil.isValidMicrochip(petData.microchipId)) {
      errors.push({
        field: 'microchipId',
        message: 'Invalid microchip ID format',
        value: petData.microchipId,
      });
    }

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const pet = await PetsService.createPet(user.petOwner.id, petData);
    return ResponseHandler.created(res, pet, 'Pet created successfully');
  });

  static getPets = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { page, limit, status } = req.query;

    const { page: validPage, limit: validLimit, errors } = ValidationUtil.validatePagination(
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    // Get owner ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { petOwner: true },
    });

    if (!user?.petOwner) {
      return ResponseHandler.error(res, 'Pet owner profile not found', 400);
    }

    const result = await PetsService.getPetsByOwner(
      user.petOwner.id,
      validPage,
      validLimit,
      status as any
    );

    return ResponseHandler.success(res, result.pets, undefined, 200, result.meta);
  });

  static getPetById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { petId } = req.params;
    const userId = req.user!.id;

    if (!petId) {
      return ResponseHandler.error(res, 'Pet ID is required', 400);
    }

    const pet = await PetsService.getPetById(petId, userId);
    return ResponseHandler.success(res, pet);
  });

  static updatePet = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { petId } = req.params;
    const userId = req.user!.id;
    const updateData = req.body;

    // Validate birth date if provided
    const errors: Array<{field: string; message: string; value?: any}> = [];
    if (updateData.birthDate) {
      const dateError = ValidationUtil.validateDateNotFuture(updateData.birthDate, 'birthDate');
      if (dateError) errors.push(dateError);

      const ageError = ValidationUtil.validateAge(updateData.birthDate);
      if (ageError) errors.push(ageError);
    }

    // Validate weight and height if provided
    if (updateData.weight && !ValidationUtil.isValidWeight(updateData.weight)) {
      errors.push({
        field: 'weight',
        message: 'Weight must be between 0 and 200 kg',
        value: updateData.weight,
      });
    }

    if (updateData.height && !ValidationUtil.isValidHeight(updateData.height)) {
      errors.push({
        field: 'height',
        message: 'Height must be between 0 and 200 cm',
        value: updateData.height,
      });
    }

    // Validate microchip if provided
    if (updateData.microchipId && !ValidationUtil.isValidMicrochip(updateData.microchipId)) {
      errors.push({
        field: 'microchipId',
        message: 'Invalid microchip ID format',
        value: updateData.microchipId,
      });
    }

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    if (!petId) {
      return ResponseHandler.error(res, 'Pet ID is required', 400);
    }

    const pet = await PetsService.updatePet(petId, userId, updateData);
    return ResponseHandler.success(res, pet, 'Pet updated successfully');
  });

  static deletePet = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { petId } = req.params;
    const userId = req.user!.id;

    if (!petId) {
      return ResponseHandler.error(res, 'Pet ID is required', 400);
    }

    await PetsService.deletePet(petId, userId);
    return ResponseHandler.noContent(res);
  });

  static addVaccinations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { petId } = req.params;
    const { vaccinations } = req.body;
    const userId = req.user!.id;

    if (!petId) {
      return ResponseHandler.error(res, 'Pet ID is required', 400);
    }

    // Check access to pet
    await PetsService.getPetById(petId, userId);

    // Validate vaccinations
    if (!Array.isArray(vaccinations) || vaccinations.length === 0) {
      return ResponseHandler.validationError(res, [{
        field: 'vaccinations',
        message: 'Vaccinations array is required',
      }]);
    }

    const errors: Array<{field: string; message: string}> = [];
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
      } else {
        const dateError = ValidationUtil.validateDateNotFuture(
          vaccination.administeredDate,
          `vaccinations[${index}].administeredDate`
        );
        if (dateError) errors.push(dateError);
      }
    });

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    const records = await PetsService.addVaccinationRecords(petId, vaccinations);
    return ResponseHandler.created(res, records, 'Vaccination records added successfully');
  });

  static getVaccinations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { petId } = req.params;
    const userId = req.user!.id;

    if (!petId) {
      return ResponseHandler.error(res, 'Pet ID is required', 400);
    }

    const vaccinations = await PetsService.getPetVaccinations(petId, userId);
    return ResponseHandler.success(res, vaccinations);
  });

  static getSpeciesAndBreeds = asyncHandler(async (_req: Request, res: Response) => {
    const species = await PetsService.getSpeciesAndBreeds();
    return ResponseHandler.success(res, species);
  });

  static getVaccineTypes = asyncHandler(async (_req: Request, res: Response) => {
    const vaccineTypes = await PetsService.getVaccineTypes();
    return ResponseHandler.success(res, vaccineTypes);
  });
}