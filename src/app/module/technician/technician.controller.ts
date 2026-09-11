import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { TechnicianService } from "./technician.service.js";

// ==================================================
// Register User as Technician
// ==================================================
const registerTechnician = catchAsync(async (req: Request, res: Response) => {
    console.log("request : ", req.body);
    console.log("Technician Payload: ", req.files);
    const payload = req.body.data;

    const files = req.files as { [fieldName: string]: Express.Multer.File[] };

    const resume = files?.["resume"]?.[0]!;

    const result = await TechnicianService.registerTechnician(payload, resume);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "OTP Sent. Please Verify Email.",
        data: result,
    });
});

export const TechnicianController = {
    registerTechnician,
};
