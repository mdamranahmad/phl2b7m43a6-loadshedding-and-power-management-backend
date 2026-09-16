-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'TECHNICIAN', 'SUBSTATION_MANAGER', 'ZONE_MANAGER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TechnicianVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TechnicianAvailabilityStatus" AS ENUM ('OFF_DUTY', 'AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "MeterType" AS ENUM ('ONLINE_PREPAID', 'ONLINE_POSTPAID', 'OFFLINE_PREPAID', 'OFFLINE_POSTPAID');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('USED', 'UNUSED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'UPCOMING', 'ONGOING', 'COMPLETED');

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "substationId" TEXT NOT NULL,
    "feederId" TEXT NOT NULL,
    "isPowerOut" BOOLEAN NOT NULL DEFAULT false,
    "scheduleStart" TIMESTAMP(3),
    "scheduleEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT,
    "contactNumber" TEXT,
    "meterNumber" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "substationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feeders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "houses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "substationId" TEXT NOT NULL,
    "feederId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPowerOut" BOOLEAN NOT NULL DEFAULT false,
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleStart" TIMESTAMP(3),
    "scheduleEnd" TIMESTAMP(3),

    CONSTRAINT "houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "paymentGateway" TEXT NOT NULL DEFAULT 'bkash',
    "merchantInvoiceNumber" TEXT NOT NULL,
    "bkashPaymentId" TEXT,
    "bkashTrxId" TEXT,
    "payerReference" TEXT,
    "paidAt" TEXT,
    "gatewayResponse" JSONB,
    "refundTrxId" TEXT,
    "refundAmount" TEXT,
    "refundReason" TEXT,
    "refundAt" TEXT,
    "tokenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "areaId" TEXT NOT NULL,
    "subStationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "scheduleBatchId" TEXT NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule-batches" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT,
    "scheduleDuration" INTEGER NOT NULL,
    "outageSlotDuration" INTEGER NOT NULL,
    "batchStartTime" TIMESTAMP(3) NOT NULL,
    "batchEndTime" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subStationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "schedule-batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "substations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacityKw" INTEGER,
    "allocatedKw" INTEGER,
    "subStationManagerId" TEXT,
    "zoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "substations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "substationManager" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactNumber" TEXT,
    "employeeId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "substationManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technicianProfiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactNumber" TEXT,
    "expertise" TEXT NOT NULL,
    "experienceYear" INTEGER NOT NULL,
    "verificationStatus" "TechnicianVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resumeUrl" TEXT,
    "resumePublicId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isAvailable" "TechnicianAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "userId" TEXT NOT NULL,

    CONSTRAINT "technicianProfiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "tokenNo" TEXT NOT NULL,
    "tokenSeqNo" INTEGER NOT NULL,
    "meterNo" TEXT NOT NULL,
    "meterType" "MeterType" NOT NULL DEFAULT 'OFFLINE_PREPAID',
    "rechargeAmount" DECIMAL(65,30) NOT NULL,
    "tokenStatus" "TokenStatus" NOT NULL DEFAULT 'UNUSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" DEFAULT 'CUSTOMER',
    "status" "UserStatus" DEFAULT 'ACTIVE',
    "nid" TEXT,
    "dob" TEXT,
    "isDeleted" BOOLEAN DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "emailVerified" BOOLEAN DEFAULT false,
    "needPasswordChange" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zonalManagerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zoneManager" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactNumber" TEXT,
    "employeeId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "zoneManager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "areas_zoneId_idx" ON "areas"("zoneId");

-- CreateIndex
CREATE INDEX "areas_substationId_idx" ON "areas"("substationId");

-- CreateIndex
CREATE INDEX "areas_feederId_idx" ON "areas"("feederId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_userId_key" ON "customers"("userId");

-- CreateIndex
CREATE INDEX "idx_customer_email" ON "customers"("email");

-- CreateIndex
CREATE INDEX "idx_customer_isDeleted" ON "customers"("isDeleted");

-- CreateIndex
CREATE INDEX "feeders_zoneId_idx" ON "feeders"("zoneId");

-- CreateIndex
CREATE INDEX "feeders_substationId_idx" ON "feeders"("substationId");

-- CreateIndex
CREATE INDEX "houses_zoneId_idx" ON "houses"("zoneId");

-- CreateIndex
CREATE INDEX "houses_substationId_idx" ON "houses"("substationId");

-- CreateIndex
CREATE INDEX "houses_feederId_idx" ON "houses"("feederId");

-- CreateIndex
CREATE INDEX "houses_areaId_idx" ON "houses"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_merchantInvoiceNumber_key" ON "payments"("merchantInvoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_bkashPaymentId_key" ON "payments"("bkashPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_tokenId_key" ON "payments"("tokenId");

-- CreateIndex
CREATE INDEX "schedules_subStationId_idx" ON "schedules"("subStationId");

-- CreateIndex
CREATE INDEX "schedules_createdById_idx" ON "schedules"("createdById");

-- CreateIndex
CREATE INDEX "schedules_scheduleBatchId_idx" ON "schedules"("scheduleBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_areaId_startTime_endTime_key" ON "schedules"("areaId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "schedule-batches_subStationId_idx" ON "schedule-batches"("subStationId");

-- CreateIndex
CREATE INDEX "schedule-batches_createdById_idx" ON "schedule-batches"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "substations_subStationManagerId_key" ON "substations"("subStationManagerId");

-- CreateIndex
CREATE INDEX "substations_zoneId_idx" ON "substations"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "substationManager_email_key" ON "substationManager"("email");

-- CreateIndex
CREATE UNIQUE INDEX "substationManager_userId_key" ON "substationManager"("userId");

-- CreateIndex
CREATE INDEX "substationManager_zoneId_idx" ON "substationManager"("zoneId");

-- CreateIndex
CREATE INDEX "idx_substationManager_email" ON "substationManager"("email");

-- CreateIndex
CREATE UNIQUE INDEX "technicianProfiles_email_key" ON "technicianProfiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "technicianProfiles_userId_key" ON "technicianProfiles"("userId");

-- CreateIndex
CREATE INDEX "idx_technician_email" ON "technicianProfiles"("email");

-- CreateIndex
CREATE INDEX "idx_technician_isDeleted" ON "technicianProfiles"("isDeleted");

-- CreateIndex
CREATE INDEX "tokens_customerId_idx" ON "tokens"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nid_key" ON "users"("nid");

-- CreateIndex
CREATE UNIQUE INDEX "zones_zonalManagerId_key" ON "zones"("zonalManagerId");

-- CreateIndex
CREATE UNIQUE INDEX "zoneManager_email_key" ON "zoneManager"("email");

-- CreateIndex
CREATE UNIQUE INDEX "zoneManager_userId_key" ON "zoneManager"("userId");

-- CreateIndex
CREATE INDEX "idx_zoneManager_email" ON "zoneManager"("email");

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_substationId_fkey" FOREIGN KEY ("substationId") REFERENCES "substations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "feeders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feeders" ADD CONSTRAINT "feeders_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feeders" ADD CONSTRAINT "feeders_substationId_fkey" FOREIGN KEY ("substationId") REFERENCES "substations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "houses" ADD CONSTRAINT "houses_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "houses" ADD CONSTRAINT "houses_substationId_fkey" FOREIGN KEY ("substationId") REFERENCES "substations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "houses" ADD CONSTRAINT "houses_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "feeders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "houses" ADD CONSTRAINT "houses_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_subStationId_fkey" FOREIGN KEY ("subStationId") REFERENCES "substations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "substationManager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_scheduleBatchId_fkey" FOREIGN KEY ("scheduleBatchId") REFERENCES "schedule-batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule-batches" ADD CONSTRAINT "schedule-batches_subStationId_fkey" FOREIGN KEY ("subStationId") REFERENCES "substations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule-batches" ADD CONSTRAINT "schedule-batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "substationManager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substations" ADD CONSTRAINT "substations_subStationManagerId_fkey" FOREIGN KEY ("subStationManagerId") REFERENCES "substationManager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substations" ADD CONSTRAINT "substations_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substationManager" ADD CONSTRAINT "substationManager_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substationManager" ADD CONSTRAINT "substationManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technicianProfiles" ADD CONSTRAINT "technicianProfiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_zonalManagerId_fkey" FOREIGN KEY ("zonalManagerId") REFERENCES "zoneManager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zoneManager" ADD CONSTRAINT "zoneManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
