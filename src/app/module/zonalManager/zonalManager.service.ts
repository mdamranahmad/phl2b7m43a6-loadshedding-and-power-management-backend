import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import httpStatus from "http-status";
import {
    OutageReportStatus,
    ScheduleStatus,
} from "../../../generated/prisma/enums.js";
import type { IRequestUser } from "../../middleware/checkAuth.js";
import { isAfter } from "date-fns";
import type { IQuery } from "../../interfaces/index.js";
import type { OutageReportWhereInput } from "../../../generated/prisma/models.js";

// ==================================================
// Get Outage Reports for a Zone by ZoneManager
// ==================================================
const getOutageReports = async (query: IQuery, user: IRequestUser) => {
    const manager = await prisma.zoneManager.findUnique({
        where: { userId: user.userId, isDeleted: false },
        select: {
            id: true,
            zone: true,
        },
    });

    if (!manager || !manager.zone) {
        throw new AppError(httpStatus.NOT_FOUND, "Manager Profile Not Foun!");
    }

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const andConditions: OutageReportWhereInput[] = [{ zone: manager.zone }];

    // Searching
    if (query.searchTerm) {
        // const searchTerm = String(query.searchTerm).trim();
        andConditions.push({
            OR: [
                {
                    ticketNo: {
                        contains: query.searchTerm,
                        mode: "insensitive",
                    },
                },
                { title: { contains: query.searchTerm, mode: "insensitive" } },
                {
                    description: {
                        contains: query.searchTerm,
                        mode: "insensitive",
                    },
                },
                {
                    address: {
                        contains: query.searchTerm,
                        mode: "insensitive",
                    },
                },
                {
                    area: {
                        name: {
                            contains: query.searchTerm,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    reporter: {
                        name: {
                            contains: query.searchTerm,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    subStation: {
                        name: {
                            contains: query.searchTerm,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    technician: {
                        name: {
                            contains: query.searchTerm,
                            mode: "insensitive",
                        },
                    },
                },
            ],
        });
    }

    // Filtering
    // if (query.batchStartTime) {
    //     andConditions.push({ batchStartTime: query.batchStartTime });
    // }

    if (query.isAssigned) {
        andConditions.push({ isAssigned: query.isAssigned });
    }

    if (query.isOngoing) {
        andConditions.push({ isOngoing: query.isOngoing });
    }

    if (query.ticketNo) {
        andConditions.push({ ticketNo: query.ticketNo });
    }

    if (query.reportStatus) {
        andConditions.push({
            reportStatus: query.reportStatus as OutageReportStatus,
        });
    }

    // Default Filter Conditions
    // andConditions.push({ isDeleted: false });

    const allOutageReports = await prisma.outageReport.findMany({
        where: { AND: andConditions },
        take: limit,
        skip,
        orderBy: { [sortBy]: sortOrder },
    });

    const totalOutageReportsCount = await prisma.outageReport.count({
        where: { AND: andConditions },
    });

    return {
        data: allOutageReports,
        meta: {
            page,
            limit,
            total: totalOutageReportsCount,
            totalPages: Math.ceil(totalOutageReportsCount / limit),
        },
    };
};

// ==================================================
// Get Outage Report Details By Report Id for a Zone by ZoneManager
// ==================================================
const getOutageReportById = async (
    outageReportId: string,
    user: IRequestUser,
) => {
    const manager = await prisma.zoneManager.findUnique({
        where: { userId: user.userId, isDeleted: false },
        select: {
            id: true,
            zone: true,
        },
    });

    if (!manager || !manager.zone) {
        throw new AppError(httpStatus.NOT_FOUND, "Manager Profile Not Foun!");
    }

    const outageReport = await prisma.outageReport.findUnique({
        where: { id: outageReportId, zone: manager.zone },
        include: {
            area: true,
            reporter: true,
            technician: true,
        },
    });

    if (!outageReport) {
        throw new AppError(httpStatus.NOT_FOUND, "Outage Report Not Found!");
    }

    return outageReport;
};

// ==================================================
// Approve Outage Report for a Zone by ZoneManager
// ==================================================
const approveOutageReport = async (
    outageReportId: string,
    user: IRequestUser,
) => {
    const manager = await prisma.zoneManager.findUnique({
        where: { userId: user.userId, isDeleted: false },
        select: {
            id: true,
            zone: true,
        },
    });

    if (!manager || !manager.zone) {
        throw new AppError(httpStatus.NOT_FOUND, "Manager Profile Not Found!");
    }

    const isReportExists = await prisma.outageReport.findUnique({
        where: { id: outageReportId, zone: manager.zone },
    });

    if (!isReportExists) {
        throw new AppError(httpStatus.NOT_FOUND, "Outage Report Not Found!");
    }

    if (isReportExists.reportStatus !== OutageReportStatus.PENDING) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            "Outage Report Is Not Pending. Cannot Approve!",
        );
    }

    const approvedOutageReport = await prisma.outageReport.update({
        where: { id: isReportExists.id },
        data: { reportStatus: OutageReportStatus.APPROVED },
        include: {
            area: true,
            reporter: true,
            technician: true,
        },
    });

    return approvedOutageReport;
};

export const ZonalManagerService = {
    getOutageReports,
    getOutageReportById,
    approveOutageReport,
};
