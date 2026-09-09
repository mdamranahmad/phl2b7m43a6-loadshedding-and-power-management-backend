import type { NextFunction, Request, Response } from "express";
import { UserStatus, type Role } from "../../generated/prisma/enums.js";
import { catchAsync } from "../utils/catchAsync.js";
import httpStatus from "http-status";
import { AppError } from "../utils/AppError.js";
import { jwtUtils } from "../utils/jwt.js";
import config from "../config/index.js";
import type { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";

export interface IRequestUser {
    userId: string;
    name: string;
    email: string;
    role: Role;
}

declare global {
    namespace Express {
        interface Request {
            user?: IRequestUser;
        }
    }
}

export const auth = (...requiredRoles: Role[]) => {
    return catchAsync(
        async (req: Request, res: Response, next: NextFunction) => {
            const token = req.cookies.accessToken
                ? req.cookies.accessToken
                : req.headers.authorization?.startsWith("Bearer ")
                  ? req.headers.authorization.split(" ")[1]
                  : req.headers.authorization;
            if (!token) {
                throw new AppError(
                    httpStatus.UNAUTHORIZED,
                    "You are not logged in. Please log in to access this resource.",
                );
            }

            const verifiedToken = jwtUtils.verifyToken(
                token,
                config.jwt_access_secret,
            );

            if (!verifiedToken.success || !verifiedToken.data) {
                throw new AppError(
                    httpStatus.UNAUTHORIZED,
                    config.node_env === "development"
                        ? verifiedToken.error
                        : "Invalid Token!",
                );
            }

            const { userId, name, email, role } =
                verifiedToken.data as JwtPayload;

            if (requiredRoles.length && !requiredRoles.includes(role)) {
                throw new AppError(
                    httpStatus.FORBIDDEN,
                    "You are not authorized to access this resource!",
                );
            }

            const user = await prisma.user.findUnique({
                where: {
                    id: userId,
                    name,
                    email,
                    role,
                },
                omit: { passwordHash: true },
            });

            if (
                !user ||
                !user.emailVerified ||
                user.isDeleted ||
                user.status === UserStatus.BLOCKED
            ) {
                throw new AppError(
                    httpStatus.NOT_FOUND,
                    "Unauthorized. Please Contact Support!",
                );
            }

            req.user = {
                userId,
                name,
                email,
                role,
            };

            next();
        },
    );
};
