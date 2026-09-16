import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import httpStatus from "http-status";
import { ScheduleStatus } from "../../../generated/prisma/enums.js";
import type { IRequestUser } from "../../middleware/checkAuth.js";
import type {
    IAllocateSubStationKwPayload,
    IGenerateSchedulePayload,
} from "./subStationManager.interface.js";
import { isAfter } from "date-fns";
import type { IQuery } from "../../interfaces/index.js";
import type { ScheduleBatchWhereInput } from "../../../generated/prisma/models.js";

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

export const SubStationManagerServices = {
    allocateSubStationKw,
    generateLoadSheddingSchedule,
    getScheduleBatches,
    getScheduleBatcheById,
    publishScheduleBatch,
    deleteScheduleBatch,
    getAllScheduleBatches,
};
