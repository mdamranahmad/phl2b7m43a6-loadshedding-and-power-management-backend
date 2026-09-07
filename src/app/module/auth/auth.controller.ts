import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { AuthService } from "./auth.service.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpStatus from "http-status";

// ==================================================
// Register User as Customer
// ==================================================
const registerCustomer = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    await AuthService.registerCustomer(payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "OTP Sent. Please Verify Email.",
        data: null,
    });
});

export const AuthController = {
    registerCustomer,
};
