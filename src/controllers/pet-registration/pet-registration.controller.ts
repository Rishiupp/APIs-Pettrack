import { Request, Response } from 'express';
import { PetRegistrationService } from '../../services/pet-registration/pet-registration.service';
import { ResponseHandler } from '../../utils/response';
import { ValidationUtil } from '../../utils/validation';
import { AuthRequest } from '../../types';
import { asyncHandler } from '../../middleware/error-handling';

export class PetRegistrationController {
  static submitApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const applicationData = req.body;

    // Basic validation
    const errors = [];

    // Validate location
    if (!applicationData.location) {
      errors.push({ field: 'location', message: 'Location information is required' });
    } else {
      if (!applicationData.location.city) {
        errors.push({ field: 'location.city', message: 'City is required' });
      }
      if (!applicationData.location.state) {
        errors.push({ field: 'location.state', message: 'State is required' });
      }
      if (!applicationData.location.country) {
        errors.push({ field: 'location.country', message: 'Country is required' });
      }
    }

    // Validate required fields
    if (!applicationData.requiredFields) {
      errors.push({ field: 'requiredFields', message: 'Required fields are missing' });
    } else {
      const requiredFieldErrors = ValidationUtil.validateRequired({
        applicationType: applicationData.requiredFields.applicationType,
        identifierType: applicationData.requiredFields.identifierType,
        submittedAt: applicationData.requiredFields.submittedAt,
      });
      errors.push(...requiredFieldErrors);
    }

    // Validate applicant
    if (!applicationData.applicant) {
      errors.push({ field: 'applicant', message: 'Applicant information is required' });
    } else {
      const applicantErrors = ValidationUtil.validateRequired({
        applicantType: applicationData.applicant.applicantType,
        name: applicationData.applicant.name,
        email: applicationData.applicant.email,
        phone: applicationData.applicant.phone,
        pincode: applicationData.applicant.pincode,
        address: applicationData.applicant.address,
      });
      errors.push(...applicantErrors);

      // Validate email format
      if (applicationData.applicant.email) {
        const emailError = ValidationUtil.validateEmail(applicationData.applicant.email);
        if (emailError) errors.push(emailError);
      }

      // Validate phone format
      if (applicationData.applicant.phone) {
        const phoneError = ValidationUtil.validatePhone(applicationData.applicant.phone);
        if (phoneError) errors.push(phoneError);
      }
    }

    // Validate pets array
    if (!applicationData.pets || !Array.isArray(applicationData.pets) || applicationData.pets.length === 0) {
      errors.push({ field: 'pets', message: 'At least one pet is required' });
    } else {
      applicationData.pets.forEach((pet: any, index: number) => {
        const petErrors = ValidationUtil.validateRequired({
          petName: pet.petName,
          gender: pet.gender,
          breed: pet.breed,
          dateOfBirth: pet.dateOfBirth,
          veterinaryDoctorName: pet.veterinaryDoctorName,
          veterinaryDoctorRegistrationNumber: pet.veterinaryDoctorRegistrationNumber,
          veterinaryClinicOrHospitalName: pet.veterinaryClinicOrHospitalName,
        });
        
        petErrors.forEach(error => {
          errors.push({
            field: `pets[${index}].${error.field}`,
            message: error.message,
          });
        });

        // Validate birth date
        if (pet.dateOfBirth) {
          const dateError = ValidationUtil.validateDateNotFuture(pet.dateOfBirth, `pets[${index}].dateOfBirth`);
          if (dateError) errors.push(dateError);
        }

        // Validate rabies vaccination date
        if (pet.lastRabiesVaccinationDate) {
          const dateError = ValidationUtil.validateDateNotFuture(pet.lastRabiesVaccinationDate, `pets[${index}].lastRabiesVaccinationDate`);
          if (dateError) errors.push(dateError);
        }
      });
    }

    // Validate documents
    if (!applicationData.documents) {
      errors.push({ field: 'documents', message: 'Documents information is required' });
    } else {
      if (applicationData.documents.acceptedTerms !== true) {
        errors.push({ field: 'documents.acceptedTerms', message: 'Terms and conditions must be accepted' });
      }
      if (!applicationData.documents.declarationAcknowledgement) {
        errors.push({ field: 'documents.declarationAcknowledgement', message: 'Declaration acknowledgement is required' });
      }
    }

    // Validate checkout
    if (!applicationData.checkout) {
      errors.push({ field: 'checkout', message: 'Checkout information is required' });
    } else {
      if (!applicationData.checkout.billSummary) {
        errors.push({ field: 'checkout.billSummary', message: 'Bill summary is required' });
      }
      if (!applicationData.checkout.deliveryAddress) {
        errors.push({ field: 'checkout.deliveryAddress', message: 'Delivery address is required' });
      }
    }

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    try {
      const result = await PetRegistrationService.submitApplication(userId, applicationData);
      return ResponseHandler.created(res, result, 'Pet registration application submitted successfully');
    } catch (error: any) {
      return ResponseHandler.error(res, error.message, 500);
    }
  });

  static getApplications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { page, limit } = req.query;

    const { page: validPage, limit: validLimit, errors } = ValidationUtil.validatePagination(
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    if (errors.length > 0) {
      return ResponseHandler.validationError(res, errors);
    }

    try {
      const result = await PetRegistrationService.getApplicationsByUser(userId, validPage, validLimit);
      return ResponseHandler.success(res, result.applications, undefined, 200, {
        page: result.meta.currentPage,
        limit: validLimit,
        total: result.meta.totalRecords,
        totalPages: result.meta.totalPages,
        hasNext: result.meta.hasNextPage,
        hasPrev: result.meta.hasPrevPage,
      });
    } catch (error: any) {
      return ResponseHandler.error(res, error.message, 500);
    }
  });

  static getApplicationById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { applicationId } = req.params;
    const userId = req.user?.id;

    if (!applicationId) {
      return ResponseHandler.error(res, 'Application ID is required', 400);
    }

    try {
      const application = await PetRegistrationService.getApplicationById(applicationId, userId);
      return ResponseHandler.success(res, application);
    } catch (error: any) {
      return ResponseHandler.error(res, error.message, error.message.includes('not found') ? 404 : 500);
    }
  });
}