import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { AuthService } from "./auth.service.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";

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

// ==================================================
// Email Verification for Registered Customer
// ==================================================
const emailVerification = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    const { user, customer, accessToken, refreshToken } =
        await AuthService.emailVerification(payload);

    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24,
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Customer Registration Successful.",
        data: { user, customer, accessToken, refreshToken },
    });
});

// ==================================================
// Login Registered Customer
// ==================================================
const loginUser = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    const { accessToken, refreshToken } = await AuthService.loginUser(payload);

    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24,
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "User Login Successful.",
        data: { accessToken, refreshToken },
    });
});

// ==================================================
// Token Generation for Expired Access Token
// ==================================================
const refreshToken = catchAsync(async (req: Request, res: Response) => {
    if (!req.cookies.refreshToken) {
        throw new AppError(
            httpStatus.UNAUTHORIZED,
            "Refresh Token Is Missing!",
        );
    }

    const { accessToken, refreshToken } = await AuthService.refreshToken(
        req.cookies.refreshToken,
    );

    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24,
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "New Access Token Generation Successful.",
        data: { accessToken, refreshToken },
    });
});

// ==================================================
// Get User Profile For Logged In User
// ==================================================
const getMe = catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new AppError(
            httpStatus.UNAUTHORIZED,
            "User Information Missing In Request!",
        );
    }

    const result = await AuthService.getMe(req.user);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "User Profile Feched Operation Successful.",
        data: result,
    });
});

export const AuthController = {
    registerCustomer,
    emailVerification,
    loginUser,
    refreshToken,
    getMe,
};
