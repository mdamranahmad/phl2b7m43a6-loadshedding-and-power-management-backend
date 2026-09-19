import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { AnalyticsServices } from "./analytics.service.js";

// ==================================================
// Get Analytics For Zonal Manager
// ==================================================
const getZonalManagerAnalytics = catchAsync(
    async (req: Request, res: Response) => {
        const result = await AnalyticsServices.getZonalManagerAnalytics();

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Zonal Manager Analytics Retrival Successful.",
            data: result,
        });
    },
);

// ==================================================
// Get Analytics For SubStation Manager
// ==================================================
const getSubStationlManagerAnalytics = catchAsync(
    async (req: Request, res: Response) => {
        const user = req.user!;
        const result =
            await AnalyticsServices.getSubStationlManagerAnalytics(user);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "SubStation Manager Analytics Retrival Successful.",
            data: result,
        });
    },
);

// ==================================================
// Get Analytics For SubStation Manager
// ==================================================
const getTechnicianAnalytics = catchAsync(
    async (req: Request, res: Response) => {
        const user = req.user!;
        const result = await AnalyticsServices.getTechnicianAnalytics(user);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Technician Analytics Retrival Successful.",
            data: result,
        });
    },
);

// ==================================================
// Get Analytics For SubStation Manager
// ==================================================
const getCustomerAnalytics = catchAsync(async (req: Request, res: Response) => {
    const user = req.user!;
    const result = await AnalyticsServices.getCustomerAnalytics(user);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Customer Analytics Retrival Successful.",
        data: result,
    });
});

export const AnalyticsController = {
    getZonalManagerAnalytics,
    getSubStationlManagerAnalytics,
    getTechnicianAnalytics,
    getCustomerAnalytics,
};
