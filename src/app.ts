import express, { type Express, type Request, type Response } from "express";
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

app.get("/", (req: Request, res: Response) => {
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Welcome to Load Shedding and Power Managemetn System",
        data: null,
    });
});

// Global Error Handler and Not Found
app.use(globalErrorHandler);
app.use(notFound);

export default app;
