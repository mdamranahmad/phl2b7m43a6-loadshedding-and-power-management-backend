import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { SubStationManagerServices } from "./subStationManager.service.js";

// ==================================================
// Allocate Kw to SubStation by SubStationManager
// ==================================================
const allocateSubStationKw = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    const user = req.user!;

    const result = await SubStationManagerServices.allocateSubStationKw(
        payload,
        user,
    );

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Allocate Kx To SubStation Successful.",
        data: result,
    });
});

// ==================================================
// Generate Load Shedding Schedule to SubStation by SubStationManager
// ==================================================
const generateLoadSheddingSchedule = catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body;

        const user = req.user!;

        const result =
            await SubStationManagerServices.generateLoadSheddingSchedule(
                payload,
                user,
            );

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.CREATED,
            message: "Schedule Generation Successful.",
            data: result,
        });
    },
);

// ==================================================
// Get Schedule Batches for a  SubStation by SubStationManager
// ==================================================
const getScheduleBatches = catchAsync(async (req: Request, res: Response) => {
    const user = req.user!;

    const result = await SubStationManagerServices.getScheduleBatches(
        req.query,
        user,
    );

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Fetch Schedule Batch Successful.",
        data: result,
    });
});

// ==================================================
// Get Schedule Batche By Id for admins
// ==================================================
const getScheduleBatcheById = catchAsync(
    async (req: Request, res: Response) => {
        const scheduleBatchId = req.params.scheduleBatchId as string;

        const user = req.user!;

        const result = await SubStationManagerServices.getScheduleBatcheById(
            scheduleBatchId,
            user,
        );

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Fetch Schedule Batch Successful.",
            data: result,
        });
    },
);

// ==================================================
// Publish Schedule Batch for a  SubStation by SubStationManager
// ==================================================
const publishScheduleBatch = catchAsync(async (req: Request, res: Response) => {
    const scheduleBatchId = req.params.scheduleBatchId as string;

    const user = req.user!;

    const result = await SubStationManagerServices.publishScheduleBatch(
        scheduleBatchId,
        user,
    );

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Schedule Batch Publiash Successful.",
        data: result,
    });
});

// ==================================================
// Delete Schedule Batch for a  SubStation by SubStationManager
// ==================================================
const deleteScheduleBatch = catchAsync(async (req: Request, res: Response) => {
    const scheduleBatchId = req.params.scheduleBatchId as string;

    const user = req.user!;

    const result = await SubStationManagerServices.deleteScheduleBatch(
        scheduleBatchId,
        user,
    );

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Schedule Batch Delete Successful.",
        data: result,
    });
});

// ==================================================
// Get All Schedule Batches (Zone Manager Only)
// ==================================================
const getAllScheduleBatches = catchAsync(
    async (req: Request, res: Response) => {
        const user = req.user!;

        const result = await SubStationManagerServices.getAllScheduleBatches(
            req.query,
            user,
        );

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Fetch Schedule Batches Successful.",
            data: result,
        });
    },
);

export const SubStationManagerController = {
    allocateSubStationKw,
    generateLoadSheddingSchedule,
    getScheduleBatches,
    getScheduleBatcheById,
    publishScheduleBatch,
    deleteScheduleBatch,
    getAllScheduleBatches,
};
