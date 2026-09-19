import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import config from "../config/index.js";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../utils/AppError.js";

export const globalErrorHandler = (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
    // 1. ALWAYS log unexpected errors to stdout/stderr so cloud loggers (Vercel, Datadog) capture them
    if (config.node_env === "development" || !(err instanceof AppError)) {
        console.error("Global Error Handler Log:", err);
    }

    let statusCode: number = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage: string = err.message || "Something went wrong!";
    let errorName: string = err.name || "InternalServerError";

    // Flag to distinguish known operational business errors from unknown runtime crashes
    let isOperational = err instanceof AppError;

    // 2. Map Known Prisma Errors
    if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = httpStatus.BAD_REQUEST;
        errorMessage = "You have provided incorrect field types or missing required fields.";
        errorName = "PrismaValidationError";
        isOperational = true;
    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        errorName = `PrismaKnownRequestError (${err.code})`;
        isOperational = true;

        if (err.code === "P2002") {
            statusCode = httpStatus.CONFLICT;
            const target = (err.meta?.target as string[])?.join(", ");
            errorMessage = target
                ? `Duplicate value for field(s): ${target}`
                : "Duplicate Key Error";
        } else if (err.code === "P2003") {
            statusCode = httpStatus.BAD_REQUEST;
            errorMessage = "Foreign Key Constraint Failed!";
        } else if (err.code === "P2025") {
            statusCode = httpStatus.NOT_FOUND;
            errorMessage = "The requested record was not found or has dependent references!";
        }
    } else if (err instanceof Prisma.PrismaClientInitializationError) {
        errorName = "PrismaInitializationError";
        if (err.errorCode === "P1000") {
            statusCode = httpStatus.UNAUTHORIZED;
            errorMessage = "Database authentication failed. Check database credentials.";
        } else if (err.errorCode === "P1001") {
            statusCode = httpStatus.SERVICE_UNAVAILABLE;
            errorMessage = "Cannot reach the database server.";
        }
    } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
        statusCode = httpStatus.INTERNAL_SERVER_ERROR;
        errorMessage = "An unknown database error occurred during query execution.";
        errorName = "PrismaUnknownRequestError";
    } else if (err instanceof AppError) {
        statusCode = err.statusCode;
        errorMessage = err.message;
        errorName = err.name || "AppError";
    }

    // 3. Construct Client Response
    // Allow operational error messages (4xx) to be visible to clients in production
    const isDev = config.node_env === "development";
    const clientMessage = isDev || isOperational ? errorMessage : "Internal Server Error";
    const clientName = isDev || isOperational ? errorName : "InternalServerError";

    res.status(statusCode).json({
        success: false,
        statusCode,
        name: clientName,
        message: clientMessage,
        ...(isDev && { error: err, stack: err.stack }),
    });
};