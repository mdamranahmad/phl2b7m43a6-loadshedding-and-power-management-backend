import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import httpStatus from "http-status";
import {
    OutageReportStatus,
    PaymentStatus,
    ScheduleStatus,
    TechnicianAvailabilityStatus,
    TechnicianVerificationStatus,
    TokenStatus,
} from "../../../generated/prisma/enums.js";
import type { IRequestUser } from "../../middleware/checkAuth.js";

// ==================================================
// Get Analytics For Zonal Manager
// ==================================================
const getZonalManagerAnalytics = async () => {
    const totalSubStations = await prisma.subStation.count({});

    const totalFeeders = await prisma.feeder.count({});

    const totalAreas = await prisma.area.count({});

    const totalHouses = await prisma.house.count({});

    const totalSubStationManagers = await prisma.subStationManager.count({
        where: { isDeleted: false },
    });

    const totalPendingTechnicinApplication =
        await prisma.technicianProfile.count({
            where: {
                isDeleted: false,
                verificationStatus: TechnicianVerificationStatus.PENDING,
            },
        });

    const totalRejectedTechnicinApplication =
        await prisma.technicianProfile.count({
            where: {
                isDeleted: false,
                verificationStatus: TechnicianVerificationStatus.REJECTED,
            },
        });

    const totalApprovedTechnicians = await prisma.technicianProfile.count({
        where: {
            isDeleted: false,
            verificationStatus: TechnicianVerificationStatus.APPROVED,
        },
    });

    const totalAvailableTechnicians = await prisma.technicianProfile.count({
        where: {
            isDeleted: false,
            verificationStatus: TechnicianVerificationStatus.APPROVED,
            isAvailable: TechnicianAvailabilityStatus.AVAILABLE,
        },
    });

    const totalCustomers = await prisma.customerProfile.count({
        where: { isDeleted: false },
    });

    const totalOutageScheduleBatchs = await prisma.scheduleBatch.count({
        where: { isDeleted: false, status: ScheduleStatus.PUBLISHED },
    });

    const totalOngoinOutageScheduleBatchs = await prisma.scheduleBatch.count({
        where: { isDeleted: false, status: ScheduleStatus.ONGOING },
    });

    const totalOutageReports = await prisma.outageReport.count({});

    const totalOngoinIssues = await prisma.outageReport.count({
        where: { isOngoing: true },
    });

    const totalAssignedIssue = await prisma.outageReport.count({
        where: { isOngoing: true, isAssigned: true },
    });

    const totalResolvedIssue = await prisma.outageReport.count({
        where: {
            isOngoing: true,
            isAssigned: true,
            reportStatus: OutageReportStatus.RESOLVED,
        },
    });

    const totalTokens = await prisma.token.count({});

    const totalUnpaidTokens = await prisma.token.count({
        where: { payment: { status: PaymentStatus.UNPAID } },
    });

    const totalUnusedTokens = await prisma.token.count({
        where: {
            payment: { status: PaymentStatus.PAID },
            tokenStatus: TokenStatus.UNUSED,
        },
    });

    const totalRevenueResult = await prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID },
        _sum: { amount: true },
    });

    const totalRevenue = Number(totalRevenueResult._sum.amount);

    return {
        totalSubStations,
        totalFeeders,
        totalAreas,
        totalHouses,
        totalSubStationManagers,
        totalPendingTechnicinApplication,
        totalRejectedTechnicinApplication,
        totalApprovedTechnicians,
        totalAvailableTechnicians,
        totalCustomers,
        totalOutageScheduleBatchs,
        totalOngoinOutageScheduleBatchs,
        totalOutageReports,
        totalOngoinIssues,
        totalAssignedIssue,
        totalResolvedIssue,
        totalTokens,
        totalUnpaidTokens,
        totalUnusedTokens,
        totalRevenue,
    };
};

// ==================================================
// Get Analytics For SubStation Manager
// ==================================================
const getSubStationlManagerAnalytics = async (user: IRequestUser) => {
    const manager = await prisma.subStationManager.findUnique({
        where: { userId: user.userId, isDeleted: false },
        select: {
            id: true,
            subStation: { select: { id: true } },
        },
    });

    if (!manager || !manager.subStation?.id) {
        throw new AppError(httpStatus.NOT_FOUND, "Manager Profile Not Found!");
    }

    const totalFeeders = await prisma.feeder.count({
        where: { substationId: manager.subStation.id },
    });

    const totalAreas = await prisma.area.count({
        where: { substationId: manager.subStation.id },
    });

    const totalHouses = await prisma.house.count({
        where: { substationId: manager.subStation.id },
    });

    const totalAvailableTechnicians = await prisma.technicianProfile.count({
        where: {
            isDeleted: false,
            verificationStatus: TechnicianVerificationStatus.APPROVED,
            isAvailable: TechnicianAvailabilityStatus.AVAILABLE,
        },
    });

    const totalCustomers = await prisma.customerProfile.count({
        where: {
            isDeleted: false,
            houses: { some: { substationId: manager.subStation.id } },
        },
    });

    const totalOutageScheduleBatchs = await prisma.scheduleBatch.count({
        where: {
            isDeleted: false,
            status: ScheduleStatus.PUBLISHED,
            subStationId: manager.subStation.id,
        },
    });

    const totalOngoinOutageScheduleBatchs = await prisma.scheduleBatch.count({
        where: {
            isDeleted: false,
            status: ScheduleStatus.ONGOING,
            subStationId: manager.subStation.id,
        },
    });

    const totalOutageReports = await prisma.outageReport.count({
        where: { subStationId: manager.subStation.id },
    });

    const totalOngoinIssues = await prisma.outageReport.count({
        where: { isOngoing: true, subStationId: manager.subStation.id },
    });

    const totalAssignedIssue = await prisma.outageReport.count({
        where: {
            isOngoing: true,
            isAssigned: true,
            subStationId: manager.subStation.id,
        },
    });

    const totalResolvedIssue = await prisma.outageReport.count({
        where: {
            isOngoing: true,
            isAssigned: true,
            reportStatus: OutageReportStatus.RESOLVED,
            subStationId: manager.subStation.id,
        },
    });

    return {
        totalFeeders,
        totalAreas,
        totalHouses,
        totalAvailableTechnicians,
        totalCustomers,
        totalOutageScheduleBatchs,
        totalOngoinOutageScheduleBatchs,
        totalOutageReports,
        totalOngoinIssues,
        totalAssignedIssue,
        totalResolvedIssue,
    };
};

// ==================================================
// Get Analytics For Technician
// ==================================================
const getTechnicianAnalytics = async (user: IRequestUser) => {
    const technician = await prisma.technicianProfile.findUnique({
        where: { userId: user.userId, isDeleted: false },
        select: {
            id: true,
        },
    });

    if (!technician) {
        throw new AppError(
            httpStatus.NOT_FOUND,
            "Technician Profile Not Found!",
        );
    }

    const totalAssignment = await prisma.outageReport.count({
        where: { technicianId: technician.id },
    });

    const totalResolvedAssignment = await prisma.outageReport.count({
        where: {
            technicianId: technician.id,
            reportStatus: OutageReportStatus.RESOLVED,
        },
    });

    return { totalAssignment, totalResolvedAssignment };
};

// ==================================================
// Get Analytics For Customer
// ==================================================
const getCustomerAnalytics = async (user: IRequestUser) => {
    const customer = await prisma.customerProfile.findUnique({
        where: { userId: user.userId, isDeleted: false },
        select: {
            id: true,
            email: true,
        },
    });

    if (!customer) {
        throw new AppError(httpStatus.NOT_FOUND, "Customer Profile Not Found!");
    }

    const totalTokens = await prisma.token.count({
        where: { customerId: customer.id },
    });

    const totalUnusedTokens = await prisma.token.count({
        where: { customerId: customer.id, tokenStatus: TokenStatus.UNUSED },
    });

    const totalRechargeAmountResult = await prisma.payment.aggregate({
        where: { payerReference: customer.email, status: PaymentStatus.PAID },
        _sum: { amount: true },
    });

    const totalRechargeAmount = Number(totalRechargeAmountResult._sum.amount);

    const totalOutageReports = await prisma.outageReport.count({
        where: { reporterId: customer.id },
    });

    const totalResolvedOutageReports = await prisma.outageReport.count({
        where: {
            reporterId: customer.id,
            reportStatus: OutageReportStatus.RESOLVED,
        },
    });

    return {
        totalTokens,
        totalUnusedTokens,
        totalRechargeAmount,
        totalOutageReports,
        totalResolvedOutageReports,
    };
};

export const AnalyticsServices = {
    getZonalManagerAnalytics,
    getSubStationlManagerAnalytics,
    getTechnicianAnalytics,
    getCustomerAnalytics,
};
