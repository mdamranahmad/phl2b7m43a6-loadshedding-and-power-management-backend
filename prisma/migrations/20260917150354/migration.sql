-- CreateEnum
CREATE TYPE "OutageReportStatus" AS ENUM ('PENDING', 'APPROVED', 'ASSIGNED', 'RESOLVED', 'REOPENED');

-- CreateEnum
CREATE TYPE "OutageSeverity" AS ENUM ('TOTAL_BLACKOUT', 'PARTIAL_POWER', 'DIM_LIGHTS', 'NEIGHBORHOOD_WIDE', 'OTHERS');

-- AlterTable
ALTER TABLE "houses" ADD COLUMN     "customerId" TEXT;

-- CreateTable
CREATE TABLE "outage_reports" (
    "id" TEXT NOT NULL,
    "ticketNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "OutageSeverity" NOT NULL DEFAULT 'TOTAL_BLACKOUT',
    "outageStartTime" TEXT NOT NULL,
    "isOngoing" BOOLEAN NOT NULL DEFAULT true,
    "address" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportStatus" "OutageReportStatus" NOT NULL DEFAULT 'PENDING',
    "zoneId" TEXT NOT NULL,
    "subStationId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "technicianId" TEXT,
    "isAssigned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outage_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outage_reports_ticketNo_key" ON "outage_reports"("ticketNo");

-- CreateIndex
CREATE INDEX "outage_reports_reporterId_idx" ON "outage_reports"("reporterId");

-- CreateIndex
CREATE INDEX "outage_reports_technicianId_idx" ON "outage_reports"("technicianId");

-- CreateIndex
CREATE INDEX "outage_reports_reportStatus_isAssigned_idx" ON "outage_reports"("reportStatus", "isAssigned");

-- CreateIndex
CREATE INDEX "outage_reports_zoneId_subStationId_areaId_idx" ON "outage_reports"("zoneId", "subStationId", "areaId");

-- AddForeignKey
ALTER TABLE "houses" ADD CONSTRAINT "houses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outage_reports" ADD CONSTRAINT "outage_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outage_reports" ADD CONSTRAINT "outage_reports_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outage_reports" ADD CONSTRAINT "outage_reports_subStationId_fkey" FOREIGN KEY ("subStationId") REFERENCES "substations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outage_reports" ADD CONSTRAINT "outage_reports_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outage_reports" ADD CONSTRAINT "outage_reports_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicianProfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
