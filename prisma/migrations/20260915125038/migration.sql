-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'ONGOING', 'COMPLETED');

-- AlterTable
ALTER TABLE "areas" ADD COLUMN     "isPowerOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduleEnd" TIMESTAMP(3),
ADD COLUMN     "scheduleStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "houses" ADD COLUMN     "scheduleEnd" TIMESTAMP(3),
ADD COLUMN     "scheduleStart" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "shcedules" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "areaId" TEXT NOT NULL,
    "subStationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "shcedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shcedules_subStationId_idx" ON "shcedules"("subStationId");

-- CreateIndex
CREATE INDEX "shcedules_createdById_idx" ON "shcedules"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "shcedules_areaId_startTime_endTime_key" ON "shcedules"("areaId", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "shcedules" ADD CONSTRAINT "shcedules_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shcedules" ADD CONSTRAINT "shcedules_subStationId_fkey" FOREIGN KEY ("subStationId") REFERENCES "substations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shcedules" ADD CONSTRAINT "shcedules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "substationManager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
