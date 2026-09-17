import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { ZonalManagerService } from "./zonalManager.service.js";

// ==================================================
// Get Outage Reports for a Zone by ZoneManager
// ==================================================
const getOutageReports = catchAsync(async (req: Request, res: Response) => {
    const user = req.user!;

    const result = await ZonalManagerService.getOutageReports(req.query, user);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Fetch Outage Reports Successful.",
        data: result,
    });
});

// ==================================================
// Get Outage Report Details By Report Id for a Zone by ZoneManager
// ==================================================
const getOutageReportById = catchAsync(async (req: Request, res: Response) => {
    const outageReportId = req.params.outageReportId as string;
    const user = req.user!;

    const result = await ZonalManagerService.getOutageReportById(
        outageReportId,
        user,
    );

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Fetch Outage Report Details Successful.",
        data: result,
    });
});

// ==================================================
// Approve Outage Report for a Zone by ZoneManager
// ==================================================
const approveOutageReport = catchAsync(async (req: Request, res: Response) => {
    const outageReportId = req.params.outageReportId as string;
    const user = req.user!;

    const result = await ZonalManagerService.approveOutageReport(
        outageReportId,
        user,
    );

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Outage Report Approved Successful.",
        data: result,
    });
});

export const ZonalManagerController = {
    getOutageReports,
    getOutageReportById,
    approveOutageReport,
};
