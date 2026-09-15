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

        const result = await SubStationManagerServices.generateLoadSheddingSchedule(
            payload,
            user,
        );

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Schedule Generation Successful.",
            data: result,
        });
    },
);

export const SubStationManagerController = {
    allocateSubStationKw,
    generateLoadSheddingSchedule,
};
