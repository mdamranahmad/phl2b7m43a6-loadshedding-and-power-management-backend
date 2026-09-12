-- CreateEnum
CREATE TYPE "TechnicianAvailabilityStatus" AS ENUM ('OFF_DUTY', 'AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD');

-- AlterTable
ALTER TABLE "technicianProfiles" ADD COLUMN     "isAvailable" "TechnicianAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE';
