import prisma from '../../config/database';
import { ApplicationType, IdentifierType, ApplicantType, DocumentType } from '@prisma/client';

export interface PetRegistrationData {
  location: {
    city: string;
    state: string;
    country: string;
  };
  requiredFields: {
    applicationType: ApplicationType;
    identifierType: IdentifierType;
    identifierNumber?: string;
    submittedAt: string;
  };
  applicant: {
    applicantType: ApplicantType;
    name: string;
    fatherOrHusbandName?: string;
    email: string;
    phone: string;
    aadhaarNumber?: string;
    pincode: string;
    address: string;
  };
  pets: Array<{
    petName: string;
    gender: string;
    breed: string;
    dateOfBirth: string;
    ageOnRegistration: string;
    lastRabiesVaccinationDate: string;
    veterinaryDoctorName: string;
    veterinaryDoctorRegistrationNumber: string;
    veterinaryClinicOrHospitalName: string;
    petPhoto?: {
      name: string;
      path: string;
      mimeType: string;
      sizeBytes: number;
    };
    rabiesVaccinationCertificate?: {
      name: string;
      path: string;
      mimeType: string;
      sizeBytes: number;
    };
  }>;
  documents: {
    aadhaarCardOfApplicant?: {
      name: string;
      path: string;
      mimeType: string;
      sizeBytes: number;
    };
    applicantSignature?: {
      name: string;
      path: string;
      mimeType: string;
      sizeBytes: number;
    };
    hasTokenNumber: boolean;
    declarationAcknowledgement: string;
    acceptedTerms: boolean;
  };
  checkout: {
    items: Array<{
      sku: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }>;
    billSummary: {
      registrationFee: number;
      convenienceFee: number;
      gst: number;
      totalAmount: number;
      currency: string;
    };
    deliveryAddress: {
      addressLine: string;
      city: string;
      state: string;
      pincode: string;
    };
  };
}

export class PetRegistrationService {
  static async submitApplication(userId: string | undefined, data: PetRegistrationData) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Create the main application
        const application = await tx.petRegistrationApplication.create({
          data: {
            applicationType: data.requiredFields.applicationType,
            identifierType: data.requiredFields.identifierType,
            identifierNumber: data.requiredFields.identifierNumber,
            submittedAt: new Date(data.requiredFields.submittedAt),
            
            // Location
            city: data.location.city,
            state: data.location.state,
            country: data.location.country,
            
            // Applicant
            applicantType: data.applicant.applicantType,
            applicantName: data.applicant.name,
            fatherOrHusbandName: data.applicant.fatherOrHusbandName,
            applicantEmail: data.applicant.email,
            applicantPhone: data.applicant.phone,
            aadhaarNumber: data.applicant.aadhaarNumber,
            pincode: data.applicant.pincode,
            address: data.applicant.address,
            
            // Documents
            hasTokenNumber: data.documents.hasTokenNumber,
            declarationAcknowledgement: data.documents.declarationAcknowledgement,
            acceptedTerms: data.documents.acceptedTerms,
            
            // Checkout
            registrationFee: data.checkout.billSummary.registrationFee,
            convenienceFee: data.checkout.billSummary.convenienceFee,
            gst: data.checkout.billSummary.gst,
            totalAmount: data.checkout.billSummary.totalAmount,
            currency: data.checkout.billSummary.currency,
            
            // Delivery
            deliveryAddressLine: data.checkout.deliveryAddress.addressLine,
            deliveryCity: data.checkout.deliveryAddress.city,
            deliveryState: data.checkout.deliveryAddress.state,
            deliveryPincode: data.checkout.deliveryAddress.pincode,
          },
        });

        // Create pets
        const createdPets = [];
        for (const petData of data.pets) {
          const pet = await tx.registeredPet.create({
            data: {
              applicationId: application.id,
              petName: petData.petName,
              gender: petData.gender as any,
              breed: petData.breed,
              dateOfBirth: new Date(petData.dateOfBirth),
              ageOnRegistration: petData.ageOnRegistration,
              lastRabiesVaccinationDate: new Date(petData.lastRabiesVaccinationDate),
              veterinaryDoctorName: petData.veterinaryDoctorName,
              veterinaryDoctorRegNumber: petData.veterinaryDoctorRegistrationNumber,
              veterinaryClinicOrHospitalName: petData.veterinaryClinicOrHospitalName,
            },
          });

          // Create pet documents
          if (petData.petPhoto) {
            await tx.petDocument.create({
              data: {
                petId: pet.id,
                documentType: DocumentType.pet_photo,
                fileName: petData.petPhoto.name,
                filePath: petData.petPhoto.path,
                mimeType: petData.petPhoto.mimeType,
                sizeBytes: BigInt(petData.petPhoto.sizeBytes),
              },
            });
          }

          if (petData.rabiesVaccinationCertificate) {
            await tx.petDocument.create({
              data: {
                petId: pet.id,
                documentType: DocumentType.rabies_certificate,
                fileName: petData.rabiesVaccinationCertificate.name,
                filePath: petData.rabiesVaccinationCertificate.path,
                mimeType: petData.rabiesVaccinationCertificate.mimeType,
                sizeBytes: BigInt(petData.rabiesVaccinationCertificate.sizeBytes),
              },
            });
          }

          createdPets.push(pet);
        }

        // Create application documents
        if (data.documents.aadhaarCardOfApplicant) {
          await tx.applicationDocument.create({
            data: {
              applicationId: application.id,
              documentType: DocumentType.aadhaar_card,
              fileName: data.documents.aadhaarCardOfApplicant.name,
              filePath: data.documents.aadhaarCardOfApplicant.path,
              mimeType: data.documents.aadhaarCardOfApplicant.mimeType,
              sizeBytes: BigInt(data.documents.aadhaarCardOfApplicant.sizeBytes),
            },
          });
        }

        if (data.documents.applicantSignature) {
          await tx.applicationDocument.create({
            data: {
              applicationId: application.id,
              documentType: DocumentType.signature,
              fileName: data.documents.applicantSignature.name,
              filePath: data.documents.applicantSignature.path,
              mimeType: data.documents.applicantSignature.mimeType,
              sizeBytes: BigInt(data.documents.applicantSignature.sizeBytes),
            },
          });
        }

        // Create checkout items
        for (const item of data.checkout.items) {
          await tx.checkoutItem.create({
            data: {
              applicationId: application.id,
              sku: item.sku,
              itemName: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            },
          });
        }

        return {
          applicationId: application.id,
          pets: createdPets,
          message: 'Pet registration application submitted successfully',
        };
      });
    } catch (error) {
      console.error('Error submitting pet registration application:', error);
      throw new Error('Failed to submit pet registration application');
    }
  }

  static async getApplicationsByUser(userId: string | undefined, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [applications, total] = await Promise.all([
        prisma.petRegistrationApplication.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            pets: {
              include: {
                documents: true,
              },
            },
            documents: true,
            checkoutItems: true,
          },
        }),
        prisma.petRegistrationApplication.count(),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        applications,
        meta: {
          currentPage: page,
          totalPages,
          totalRecords: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Error fetching pet registration applications:', error);
      throw new Error('Failed to fetch pet registration applications');
    }
  }

  static async getApplicationById(applicationId: string, userId?: string) {
    try {
      const application = await prisma.petRegistrationApplication.findUnique({
        where: { id: applicationId },
        include: {
          pets: {
            include: {
              documents: true,
            },
          },
          documents: true,
          checkoutItems: true,
        },
      });

      if (!application) {
        throw new Error('Pet registration application not found');
      }

      return application;
    } catch (error) {
      console.error('Error fetching pet registration application:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Failed to fetch pet registration application');
    }
  }
}