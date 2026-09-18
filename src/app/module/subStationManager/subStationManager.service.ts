import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import httpStatus from "http-status";
import {
    OutageReportStatus,
    ScheduleStatus,
    TechnicianAvailabilityStatus,
    TechnicianVerificationStatus,
} from "../../../generated/prisma/enums.js";
import type { IRequestUser } from "../../middleware/checkAuth.js";
import type {
    IAllocateSubStationKwPayload,
    IGenerateSchedulePayload,
} from "./subStationManager.interface.js";
import { isAfter } from "date-fns";
import type { IQuery } from "../../interfaces/index.js";
import type {
    OutageReportWhereInput,
    ScheduleBatchWhereInput,
    TechnicianProfileWhereInput,
} from "../../../generated/prisma/models.js";

// ==================================================
// Allocate Kw to SubStation by SubStationManager
// ==================================================
const allocateSubStationKw = async (
    payload: IAllocateSubStationKwPayload,
    user: IRequestUser,
) => {
    const { capacityKw, allocatedKw } = payload;
    const manager = await prisma.subStationManager.findUnique({
        where: { userId: user.userId },
    });

    if (!manager || manager.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "Customer Profile Not Foun!");
    }

    const updatedSubStation = await prisma.subStation.update({
        where: { subStationManagerId: manager.id },
        data: {
            capacityKw,
            allocatedKw,
        },
    });

    return updatedSubStation;
};

// ==================================================
// Generate Load Shedding Schedule to SubStation by SubStationManager
// ==================================================
const generateLoadSheddingSchedule = async (
    payload: IGenerateSchedulePayload,
    user: IRequestUser,
) => {
    const {
        capacityKw,
        allocatedKw,
        scheduleDuration,
        outageSlotDuration,
        batchStartTime,
        batchEndTime,
    } = payload;

    if (isAfter(batchStartTime, batchEndTime)) {
        throw new AppError(
            httpStatus.CONFLICT,
            "Schedule must start before schedule end time!",
        );
    }

    const manager = await prisma.subStationManager.findUnique({
        where: { userId: user.userId },
        select: {
            id: true,
            isDeleted: true,
            subStation: { select: { id: true } },
        },
    });

    if (!manager || manager.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "Managet Profile Not Foun!");
    }

    if (!manager.subStation?.id) {
        throw new AppError(
            httpStatus.NOT_FOUND,
            "SubStation Not Found The Current User!",
        );
    }

    const areas = await prisma.area.findMany({
        where: { substationId: manager.subStation.id },
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
        },
    });

    if (areas.length === 0) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            "No areas registered under this substation to generate a schedule.",
        );
    }

    const numberOfArea = areas.length; // Total Area under a substation

    const powerDeficitRatio = 1 - allocatedKw / capacityKw; // Kw Deficit Percentage, expressed in decimal

    const areasToCutPerSlot = Math.ceil(numberOfArea * powerDeficitRatio); // Number of Area to be under power cut at once

    const totalSlots = Math.ceil(scheduleDuration / outageSlotDuration); // Total slot for schedule for the given duration

    const scheduleSlots = [];
    let currentSlotStartTime = new Date(batchStartTime);

    for (let i = 0; i < totalSlots; i++) {
        const currentSlotEndTime = new Date(
            currentSlotStartTime.getTime() + outageSlotDuration * 1000,
        );
        const startAreaIndex = (i * areasToCutPerSlot) % numberOfArea;
        const slotAreas = [];
        for (let j = 0; j < areasToCutPerSlot; j++) {
            const targetAreaIndex = (startAreaIndex + j) % numberOfArea;
            slotAreas.push(areas[targetAreaIndex]);
        }
        scheduleSlots.push({
            startTime: currentSlotStartTime,
            endTime: currentSlotEndTime,
            areas: slotAreas,
        });

        currentSlotStartTime = currentSlotEndTime;
    }

    // const scheduleArray = scheduleSlots.map((schedule, i) => {
    //     return {
    //         startTime: schedule.currentSlotStartTime,
    //         endTime: schedule.currentSlotEndTime,
    //         areaId: areas[i % areas.length]?.id as string,
    //         subStationId: substation.subStation?.id as string,
    //         createdById: manager.id,
    //     };
    // });

    const schedulePayloads = scheduleSlots.flatMap((slot) => {
        return slot.areas.map((area: any) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            areaId: area.id,
            subStationId: manager.subStation?.id as string,
            createdById: manager.id,
        }));
    });

    if (schedulePayloads.length === 0) {
        return null;
    }

    // // console.log(scheduleArray)
    // return await prisma.schedule.createMany({
    //     data: schedulePayloads,
    //     // skipDuplicates: true,
    // });

    return await prisma.scheduleBatch.create({
        data: {
            batchStartTime,
            batchEndTime,
            scheduleDuration,
            outageSlotDuration,
            createdById: manager.id,
            subStationId: manager.subStation.id,
            schedules: { createMany: { data: schedulePayloads } },
        },
    });
};

// ==================================================
// Get Schedule Batches for a  SubStation by SubStationManager
// ==================================================
const getScheduleBatches = async (query: IQuery, user: IRequestUser) => {
    const manager = await prisma.subStationManager.findUnique({
        where: { userId: user.userId },
        select: {
            id: true,
            isDeleted: true,
            subStation: { select: { id: true } },
        },
    });

    if (!manager || manager.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "Manager Profile Not Foun!");
    }

    if (!manager.subStation?.id) {
        throw new AppError(
            httpStatus.NOT_FOUND,
            "SubStation Not Found The Current User!",
        );
    }

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const andConditions: ScheduleBatchWhereInput[] = [];

    // Searching
    if (query.searchTerm) {
        andConditions.push({
            OR: [
                { title: { contains: query.searchTerm, mode: "insensitive" } },
                { reason: { contains: query.searchTerm, mode: "insensitive" } },
                {
                    subStation: {
                        name: {
                            contains: query.searchTerm,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    createdBy: {
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
    if (query.batchStartTime) {
        andConditions.push({ batchStartTime: query.batchStartTime });
    }

    if (query.status) {
        andConditions.push({ status: query.status });
    }

    // Default Filter Conditions
    andConditions.push({ isDeleted: false });

    const allScheduleBatches = await prisma.scheduleBatch.findMany({
        where: { AND: andConditions },
        take: limit,
        skip,
        orderBy: { [sortBy]: sortOrder },
    });

    const totalScheduleBatchesCount = await prisma.scheduleBatch.count({
        where: { AND: andConditions },
    });

    return {
        data: allScheduleBatches,
        meta: {
            page,
            limit,
            total: totalScheduleBatchesCount,
            totalPages: Math.ceil(totalScheduleBatchesCount / limit),
        },
    };
};

// ==================================================
// Get Schedule Batche By Id for admins
// ==================================================
const getScheduleBatcheById = async (
    scheduleBatchId: string,
    user: IRequestUser,
) => {
    const manager = await prisma.subStationManager.findUnique({
        where: { userId: user.userId },
        select: {
            id: true,
            isDeleted: true,
            subStation: { select: { id: true } },
        },
    });

    if (!manager || manager.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "Managet Profile Not Foun!");
    }

    if (!manager.subStation?.id) {
        throw new AppError(
            httpStatus.NOT_FOUND,
            "SubStation Not Found The Current User!",
        );
    }

    const scheduleBatch = await prisma.scheduleBatch.findUnique({
        where: { id: scheduleBatchId },
        include: {
            subStation: { select: { id: true, name: true } },
            schedules: true,
        },
    });

    if (!scheduleBatch || scheduleBatch.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "Schedule Batch Not Found!");
    }

    return scheduleBatch;
};

// ==================================================
// Update Schedule Batche By for a  SubStation by SubStationManager
// ==================================================
const updateScheduleBatch = async () =>
    // scheduleBatchId: string,
    // user: IRequestUser,
    {
        // const manager = await prisma.subStationManager.findUnique({
        //     where: { userId: user.userId },
        //     select: {
        //         id: true,
        //         isDeleted: true,
        //         subStation: { select: { id: true } },
        //     },
        // });
        // if (!manager || manager.isDeleted) {
        //     throw new AppError(httpStatus.NOT_FOUND, "Managet Profile Not Foun!");
        // }
        // if (!manager.subStation?.id) {
        //     throw new AppError(
        //         httpStatus.NOT_FOUND,
        //         "SubStation Not Found The Current User!",
        //     );
        // }
        // const scheduleBatch = await prisma.scheduleBatch.findUnique({
        //     where: { id: scheduleBatchId },
        //     include: {
        //         subStation: { select: { id: true, name: true } },
        //         schedules: true,
        //     },
        // });
        // if (!scheduleBatch || scheduleBatch.isDeleted) {
        //     throw new AppError(httpStatus.NOT_FOUND, "Schedule Batch Not Found!");
        // }
        // return scheduleBatch;
    };

// ==================================================
// Update Schedule By Schedule Id for a  SubStation by SubStationManager
// ==================================================
const updateScheduleById = async () =>
    //     scheduleBatchId: string,
    //     user: IRequestUser,
    {
        //     const manager = await prisma.subStationManager.findUnique({
        //         where: { userId: user.userId },
        //         select: {
        //             id: true,
        //             isDeleted: true,
        //             subStation: { select: { id: true } },
        //         },
        //     });
        //     if (!manager || manager.isDeleted) {
        //         throw new AppError(httpStatus.NOT_FOUND, "Managet Profile Not Foun!");
        //     }
        //     if (!manager.subStation?.id) {
        //         throw new AppError(
        //             httpStatus.NOT_FOUND,
        //             "SubStation Not Found The Current User!",
        //         );
        //     }
        //     const scheduleBatch = await prisma.scheduleBatch.findUnique({
        //         where: { id: scheduleBatchId },
        //         include: {
        //             subStation: { select: { id: true, name: true } },
        //             schedules: true,
        //         },
        //     });
        //     if (!scheduleBatch || scheduleBatch.isDeleted) {
        //         throw new AppError(httpStatus.NOT_FOUND, "Schedule Batch Not Found!");
        //     }
        //     return scheduleBatch;
    };

// ==================================================
// Publish Schedule Batch for a  SubStation by SubStationManager
// ==================================================
const publishScheduleBatch = async (
    scheduleBatchId: string,
    user: IRequestUser,
) => {
    const manager = await prisma.subStationManager.findUnique({
        where: { userId: user.userId },
        select: {
            id: true,
            isDeleted: true,
            subStation: { select: { id: true } },
        },
    });

    if (!manager || manager.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "Manager Profile Not Found!");
    }

    if (!manager.subStation?.id) {
        throw new AppError(
            httpStatus.NOT_FOUND,
            "SubStation Not Found For The Current User!",
        );
    }

    const scheduleBatch = await prisma.scheduleBatch.findFirst({
        where: {
            id: scheduleBatchId,
            createdById: manager.id,
            subStationId: manager.subStation.id,
            isDeleted: false,
        },
        select: { id: true, status: true },
    });

    if (!scheduleBatch) {
        throw new AppError(httpStatus.NOT_FOUND, "Schedule Batch Not Found!");
    }

    if (scheduleBatch.status !== ScheduleStatus.DRAFT) {
        throw new AppError(
            httpStatus.CONFLICT,
            "Schedule Batch Is Not iN Draft State. Cannot Publish!",
        );
    }

    return await prisma.$transaction(async (tx) => {
        await tx.schedule.updateMany({
            where: { scheduleBatchId: scheduleBatch.id },
            data: { status: ScheduleStatus.PUBLISHED },
        });

        const updatedBatch = await tx.scheduleBatch.update({
            where: { id: scheduleBatch.id },
            data: {
                status: ScheduleStatus.PUBLISHED,
            },
            include: {
                subStation: { select: { id: true, name: true } },
            },
        });

        return updatedBatch;
    });
};
// ==================================================
// Delete Schedule Batch for a  SubStation by SubStationManager
// ==================================================
const deleteScheduleBatch = async (
    scheduleBatchId: string,
    user: IRequestUser,
) => {
    const manager = await prisma.subStationManager.findUnique({
        where: { userId: user.userId },
        select: {
            id: true,
            isDeleted: true,
            subStation: { select: { id: true } },
        },
    });

    if (!manager || manager.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "Manager Profile Not Found!");
    }

    if (!manager.subStation?.id) {
        throw new AppError(
            httpStatus.NOT_FOUND,
            "SubStation Not Found For The Current User!",
        );
    }

    const scheduleBatch = await prisma.scheduleBatch.findFirst({
        where: {
            id: scheduleBatchId,
            createdById: manager.id,
            subStationId: manager.subStation.id,
            isDeleted: false,
        },
        select: { id: true, status: true },
    });

    if (!scheduleBatch) {
        throw new AppError(httpStatus.NOT_FOUND, "Schedule Batch Not Found!");
    }

    if (scheduleBatch.status === ScheduleStatus.ONGOING) {
        throw new AppError(
            httpStatus.CONFLICT,
            "Schedule Batch Is In Ongoing State. Cannot Delete!",
        );
    }

    return await prisma.$transaction(async (tx) => {
        await tx.schedule.updateMany({
            where: { scheduleBatchId: scheduleBatch.id },
            data: { isDeleted: true, deletedAt: new Date() },
        });

        const deletedBatch = await tx.scheduleBatch.update({
            where: { id: scheduleBatch.id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        });

        return deletedBatch;
    });
};

// ==================================================
// Get All Schedule Batches (Zone Manager Only)
// ==================================================
const getAllScheduleBatches = async (query: IQuery, user: IRequestUser) => {
    const manager = await prisma.zoneManager.findUnique({
        where: { userId: user.userId },
        select: {
            id: true,
            isDeleted: true,
            zone: true,
        },
    });

    if (!manager || manager.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "Manager Profile Not Foun!");
    }

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const andConditions: ScheduleBatchWhereInput[] = [];

    // Searching
    if (query.searchTerm) {
        andConditions.push({
            OR: [
                { title: { contains: query.searchTerm, mode: "insensitive" } },
                { reason: { contains: query.searchTerm, mode: "insensitive" } },
                {
                    subStation: {
                        name: {
                            contains: query.searchTerm,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    createdBy: {
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
    if (query.batchStartTime) {
        andConditions.push({
            batchStartTime: { gte: new Date(query.batchStartTime) },
        });
    }

    if (query.status) {
        andConditions.push({ status: query.status });
    }

    // Default Filter Conditions
    andConditions.push({ isDeleted: false });

    const allScheduleBatches = await prisma.scheduleBatch.findMany({
        where: { AND: andConditions },
        take: limit,
        skip,
        orderBy: { [sortBy]: sortOrder },
        include: {
            subStation: { select: { id: true, name: true } },
            createdBy: { select: { userId: true, name: true } },
        },
    });

    const totalScheduleBatchesCount = await prisma.scheduleBatch.count({
        where: { AND: andConditions },
    });

    return {
        data: allScheduleBatches,
        meta: {
            page,
            limit,
            total: totalScheduleBatchesCount,
            totalPages: Math.ceil(totalScheduleBatchesCount / limit),
        },
    };
};

// ==================================================
// Get Outage Reports for a  SubStation by SubStationManager
// ==================================================
const getOutageReports = async (query: IQuery, user: IRequestUser) => {
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

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const andConditions: OutageReportWhereInput[] = [
        {
            subStationId: manager.subStation.id,
            reportStatus: {
                not: OutageReportStatus.PENDING,
            },
        },
    ];

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
// Get Outage Report Details By Report Id for a SubStation by SubStationManager
// ==================================================
const getOutageReportById = async (
    outageReportId: string,
    user: IRequestUser,
) => {
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

    const outageReport = await prisma.outageReport.findUnique({
        where: {
            id: outageReportId,
            subStationId: manager.subStation.id,
            NOT: { reportStatus: OutageReportStatus.PENDING },
        },
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
// Get All Technicians for a  SubStation by SubStationManager
// ==================================================
const getAllTechnicians = async (query: IQuery, user: IRequestUser) => {
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

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const andConditions: TechnicianProfileWhereInput[] = [
        {
            isDeleted: false,
            verificationStatus: TechnicianVerificationStatus.APPROVED,
        },
    ];

    // Searching
    if (query.searchTerm) {
        // const searchTerm = String(query.searchTerm).trim();
        andConditions.push({
            OR: [
                {
                    address: {
                        contains: query.searchTerm,
                        mode: "insensitive",
                    },
                },
                { email: { contains: query.searchTerm, mode: "insensitive" } },
                {
                    expertise: {
                        contains: query.searchTerm,
                        mode: "insensitive",
                    },
                },
                {
                    name: {
                        contains: query.searchTerm,
                        mode: "insensitive",
                    },
                },
            ],
        });
    }

    // Filtering
    // if (query.batchStartTime) {
    //     andConditions.push({ batchStartTime: query.batchStartTime });
    // }

    if (query.isAvailable) {
        andConditions.push({ isAvailable: query.isAvailable });
    }

    // Default Filter Conditions
    // andConditions.push({ isDeleted: false });

    const allTechnicians = await prisma.technicianProfile.findMany({
        where: { AND: andConditions },
        take: limit,
        skip,
        orderBy: { [sortBy]: sortOrder },
    });

    const totalTechnicianCount = await prisma.technicianProfile.count({
        where: { AND: andConditions },
    });

    return {
        data: allTechnicians,
        meta: {
            page,
            limit,
            total: totalTechnicianCount,
            totalPages: Math.ceil(totalTechnicianCount / limit),
        },
    };
};

// ==================================================
// Approve Outage Report for a SubStation by SubStationManager
// ==================================================
const assignTechnicianToOutageReport = async (
    outageReportId: string,
    technicianId: string,
    user: IRequestUser,
) => {
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

    const isReportExists = await prisma.outageReport.findFirst({
        where: {
            id: outageReportId,
            subStationId: manager.subStation.id,
            NOT: { reportStatus: OutageReportStatus.PENDING },
        },
    });

    if (!isReportExists) {
        throw new AppError(httpStatus.NOT_FOUND, "Outage Report Not Found!");
    }

    if (
        isReportExists.reportStatus !== OutageReportStatus.APPROVED &&
        isReportExists.reportStatus !== OutageReportStatus.REOPENED
    ) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            "Only APPROVED or REOPENED outage reports can be assigned to a technician!",
        );
    }

    const isTechnicianExists = await prisma.technicianProfile.findUnique({
        where: {
            id: technicianId,
            isDeleted: false,
            verificationStatus: TechnicianVerificationStatus.APPROVED,
        },
        select: { id: true, isAvailable: true },
    });

    if (!isTechnicianExists) {
        throw new AppError(httpStatus.NOT_FOUND, "Technician Not Found!");
    }

    if (!isTechnicianExists.isAvailable) {
        throw new AppError(
            httpStatus.NOT_FOUND,
            "Technician Is Not Available!",
        );
    }

    const assignedReport = await prisma.$transaction(async (tx) => {
        await tx.technicianProfile.update({
            where: { id: technicianId },
            data: { isAvailable: TechnicianAvailabilityStatus.ASSIGNED },
        });

        return await tx.outageReport.update({
            where: { id: isReportExists.id },
            data: {
                reportStatus: OutageReportStatus.ASSIGNED,
                isAssigned: true,
                technicianId: isTechnicianExists.id,
            },
            include: {
                area: true,
                reporter: true,
                technician: true,
            },
        });
    });

    return assignedReport;
};

export const SubStationManagerServices = {
    allocateSubStationKw,
    generateLoadSheddingSchedule,
    getScheduleBatches,
    getScheduleBatcheById,
    publishScheduleBatch,
    deleteScheduleBatch,
    getAllScheduleBatches,
    getOutageReports,
    getOutageReportById,
    getAllTechnicians,
    assignTechnicianToOutageReport,
};
