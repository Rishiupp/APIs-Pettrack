/*
  Warnings:

  - Changed the type of `gender` on the `registered_pets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."Gender" ADD VALUE 'Male';
ALTER TYPE "public"."Gender" ADD VALUE 'Female';

-- AlterTable
ALTER TABLE "public"."registered_pets" DROP COLUMN "gender",
ADD COLUMN     "gender" "public"."Gender" NOT NULL;
