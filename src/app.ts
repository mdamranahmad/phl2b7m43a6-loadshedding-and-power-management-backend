import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import config from "./app/config/index.js";
import cookieParser from "cookie-parser";
import { AuthRoute } from "./app/module/auth/auth.route.js";
import { sendResponse } from "./app/utils/sendResponse.js";
import httpStatus from "http-status";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler.js";
import { notFound } from "./app/middleware/notfound.js";
import { TechnicianRoute } from "./app/module/technician/technician.route.js";
import { UserRoutes } from "./app/module/user/user.route.js";
import { SubStationManagerRoute } from "./app/module/subStationManager/subStationManager.route.js";
import { SubStationManagerServices } from "./app/module/subStationManager/subStationManager.service.js";

const app: Express = express();

// for Cross Origin Resource Sharing browser security
app.use(
    cors({
        origin: config.frontend_url,
        credentials: true,
    }),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON Body
app.use(express.json());

// Middleware to parse cookie
app.use(cookieParser());

// APIs
app.use("/api/v1/auth", AuthRoute);
app.use("/api/v1/technician", TechnicianRoute);
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/subStationManager", SubStationManagerRoute);

app.get("/", (req: Request, res: Response) => {
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Welcome to Load Shedding and Power Managemetn System",
        data: null,
    });
});

// test api
// app.get("/test", async (req: Request, res: Response, next: NextFunction) => {
// 	try {
// 		const grantIdTokenResult = await ;

// 		res.status(httpStatus.OK).json({
// 			success: true,
// 			message: "WelCome! You Are Using Test Route.",
// 			data: grantIdTokenResult,
// 		});
// 	} catch (error) {
// 		console.log(error);
// 		next(error);
// 	})

// Global Error Handler and Not Found
app.use(globalErrorHandler);
app.use(notFound);

export default app;
