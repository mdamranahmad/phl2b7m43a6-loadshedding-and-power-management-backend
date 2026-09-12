import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { TechnicianService } from "./technician.service.js";
import { ApplyAsTechnicianZSchema } from "./technician.validation.js";

// ==================================================
// Register User as Technician
// ==================================================
const registerTechnician = catchAsync(async (req: Request, res: Response) => {
    const files = req.files as { [fieldName: string]: Express.Multer.File[] };

    const resume = files?.["resume"]?.[0]!;

    const zodValidationResult = ApplyAsTechnicianZSchema.safeParse(
        JSON.parse(req.body.data),
    );

    if (!zodValidationResult.success) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            zodValidationResult.error.issues[0]?.message!,
        );
    }

    const payload = zodValidationResult.data;

    const result = await TechnicianService.registerTechnician(payload, resume);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "OTP Sent. Please Verify Email.",
        data: result,
    });
});

// ==================================================
// Email Verification for Registered Technician
// ==================================================
const emailVerification = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    const result = await TechnicianService.emailVerification(payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Technician Email Verification Successful.",
        data: result,
    });
});

// ==================================================
// Approval or Rejection of Technician Application
// ==================================================
const approveTechnician = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const reviewer = req.user!;

    const result = await TechnicianService.approveTechnician(payload, reviewer);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Technician Application Approved.",
        data: result,
    });
});

// ==================================================
// Get All Technician
// ==================================================
const getAllTechnician = catchAsync(async (req: Request, res: Response) => {
    const { data, meta } = await TechnicianService.getAllTechnician(req.query);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "All Technician Profile Fetch Successful.",
        data: data,
        meta: meta,
    });
});

// ==================================================
// Get Technician Profile By Technician Id
// ==================================================
const getTechnicianProfile = catchAsync(async (req: Request, res: Response) => {
    const technicianId = req.params.technicianId as string;

    const result = await TechnicianService.getTechnicianProfile(technicianId);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Technician Profile Fetch Operation Successful.",
        data: result,
    });
});

export const TechnicianController = {
    registerTechnician,
    emailVerification,
    approveTechnician,
    getAllTechnician,
    getTechnicianProfile,
};
