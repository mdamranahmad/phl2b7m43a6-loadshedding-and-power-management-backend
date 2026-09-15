/*
  Warnings:

  - The `allocatedKw` column on the `substations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `capacityKw` column on the `substations` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "substations" DROP COLUMN "allocatedKw",
ADD COLUMN     "allocatedKw" INTEGER,
DROP COLUMN "capacityKw",
ADD COLUMN     "capacityKw" INTEGER;
