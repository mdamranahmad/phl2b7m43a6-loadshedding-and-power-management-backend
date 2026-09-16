import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { UserServices } from "./user.service.js";

// ==================================================
// Request Recharge Token for Prepaid Meter
// ==================================================
const requestToken = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    const user = req.user!;

    const result = await UserServices.requestToken(payload, user);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Token Request Payment Process Initiation Successful.",
        data: result,
    });
});

// ==================================================
// Bkash Callback Function for Request Token
// ==================================================
const requestTokenCallBack = catchAsync(async (req: Request, res: Response) => {
    const { redirectUrl } = await UserServices.requestTokenCallBack(req.query);

    res.redirect(redirectUrl);

    // sendResponse(res, {
    //     success: true,
    //     statusCode: httpStatus.OK,
    //     message: "Token Request Payment Process Initiation Successful.",
    //     data: result,
    // });
});

// ==================================================
// Recharge Token
// ==================================================
const rechargeToken = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    const user = req.user!;

    const result = await UserServices.rechargeToken(payload, user);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Token Recharge Successful.",
        data: result,
    });
});

// ==================================================
// Get Token History for Prepaid Meter
// ==================================================
const getMyTokens = catchAsync(async (req: Request, res: Response) => {
    const user = req.user!;

    const { data, meta } = await UserServices.getMyTokens(req.query, user);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Token History Retrival Successful.",
        data: data,
        meta: meta,
    });
});

// ==================================================
// Payment for Unpaid Token for Prepaid Meter
// ==================================================
const payUnPaidToken = catchAsync(async (req: Request, res: Response) => {
    const tokenId = req.params.tokenId as string;

    const user = req.user!;

    const result = await UserServices.payUnPaidToken(tokenId, user);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Unpaid Token Payment Process Initiation Successful.",
        data: result,
    });
});

export const UserController = {
    requestToken,
    requestTokenCallBack,
    rechargeToken,
    getMyTokens,
    payUnPaidToken,
};
