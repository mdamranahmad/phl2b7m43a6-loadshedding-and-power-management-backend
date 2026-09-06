import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";

const registerCustomer = catchAsync((req: Request, res: Response) => {});

export const AuthController = {
    registerCustomer,
};
