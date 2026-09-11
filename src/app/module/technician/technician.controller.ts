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

export const TechnicianController = {
    registerTechnician,
};
