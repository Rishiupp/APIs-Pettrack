-- CreateEnum
CREATE TYPE "public"."ApplicationType" AS ENUM ('new', 'renewal');

-- CreateEnum
CREATE TYPE "public"."IdentifierType" AS ENUM ('token_or_license', 'microchip', 'registration_number');

-- CreateEnum
CREATE TYPE "public"."ApplicantType" AS ENUM ('Owner', 'Guardian', 'Caretaker');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('pet_photo', 'rabies_certificate', 'aadhaar_card', 'signature', 'other');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."PaymentPurpose" ADD VALUE 'pet_registration';
ALTER TYPE "public"."PaymentPurpose" ADD VALUE 'pet_tag';

-- CreateTable
CREATE TABLE "public"."pet_registration_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_type" "public"."ApplicationType" NOT NULL,
    "identifier_type" "public"."IdentifierType" NOT NULL,
    "identifier_number" VARCHAR(50),
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "applicant_type" "public"."ApplicantType" NOT NULL,
    "applicant_name" VARCHAR(200) NOT NULL,
    "father_or_husband_name" VARCHAR(200),
    "applicant_email" VARCHAR(255) NOT NULL,
    "applicant_phone" VARCHAR(20) NOT NULL,
    "aadhaar_number" VARCHAR(20),
    "pincode" VARCHAR(10) NOT NULL,
    "address" TEXT NOT NULL,
    "has_token_number" BOOLEAN NOT NULL DEFAULT false,
    "declaration_acknowledgement" TEXT NOT NULL,
    "accepted_terms" BOOLEAN NOT NULL DEFAULT false,
    "registration_fee" DECIMAL(10,2) NOT NULL,
    "convenience_fee" DECIMAL(10,2) NOT NULL,
    "gst" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "delivery_address_line" TEXT NOT NULL,
    "delivery_city" VARCHAR(100) NOT NULL,
    "delivery_state" VARCHAR(100) NOT NULL,
    "delivery_pincode" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_registration_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."registered_pets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "pet_name" VARCHAR(100) NOT NULL,
    "gender" VARCHAR(10) NOT NULL,
    "breed" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "age_on_registration" VARCHAR(20) NOT NULL,
    "last_rabies_vaccination_date" DATE NOT NULL,
    "veterinary_doctor_name" VARCHAR(200) NOT NULL,
    "veterinary_doctor_reg_number" VARCHAR(100) NOT NULL,
    "veterinary_clinic_or_hospital_name" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registered_pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."application_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "document_type" "public"."DocumentType" NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pet_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pet_id" UUID NOT NULL,
    "document_type" "public"."DocumentType" NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."checkout_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."registered_pets" ADD CONSTRAINT "registered_pets_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."pet_registration_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."application_documents" ADD CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."pet_registration_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pet_documents" ADD CONSTRAINT "pet_documents_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."registered_pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."checkout_items" ADD CONSTRAINT "checkout_items_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."pet_registration_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
