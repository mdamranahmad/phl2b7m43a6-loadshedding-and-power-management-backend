import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
    ICustomerEmailVerificationPayload,
    ICustomerEmailVerifiyPayload,
    ICustomerRegisterPayload,
    IUserLoginPayload,
} from "./auth.interface.js";
import httpStatus from "http-status";
import bcryptjs from "bcryptjs";
import config from "../../config/index.js";
import crypto from "crypto";
import { redisClient } from "../../lib/redis.js";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer.js";
import { Role, UserStatus } from "../../../generated/prisma/enums.js";
import { jwtUtils } from "../../utils/jwt.js";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import type { IRequestUser } from "../../middleware/checkAuth.js";

// ==================================================
// Register User as Customer
// ==================================================
const registerCustomer = async (payload: ICustomerRegisterPayload) => {
    const { name, password, customerProfile } = payload;

    const email = payload.email.trim().toLocaleLowerCase();

    const isUserExists = await prisma.user.findUnique({
        where: { email },
    });

    if (isUserExists) {
        throw new AppError(httpStatus.CONFLICT, "User Already Exists!");
    }

    const hashedPassword = await bcryptjs.hash(
        password,
        Number(config.bcrypt_salt_round),
    );

    // Temporary OTP in Redis
    const expirationSeconds = 5 * 60;

    const otpKey = `customer-registration-otp: ${email}`;
    const otpValue = crypto.randomInt(100000, 1000000).toString();

    await redisClient.set(otpKey, otpValue, {
        expiration: { type: "EX", value: expirationSeconds },
    });

    // Temporay Storage of User Data in Redis
    const redisUserDataPayload = {
        name,
        email,
        hashedPassword,
        customerProfile,
    };

    const customerRegistrationKey = `customer-registration-payload: ${email}`;

    await redisClient.set(
        customerRegistrationKey,
        JSON.stringify(redisUserDataPayload),
        { expiration: { type: "EX", value: expirationSeconds } },
    );

    const templatePath = path.join(
        process.cwd(),
        "src/app/templates/registration-user-otp.ejs",
    );

    const templateData = {
        name: name,
        email: email,
        otp: otpValue,
        expiresIn: expirationSeconds / 60,
    };

    const htmlTemplate = await ejs.renderFile(templatePath, templateData);

    await transporter.sendMail({
        from: config.email_sender,
        to: email,
        subject: "Email Verification",
        html: htmlTemplate,
    });
};

// ==================================================
// Email Verification for Registered User
// ==================================================
const emailVerification = async (
    payload: ICustomerEmailVerificationPayload,
) => {
    const otp = payload.otp;

    const email = payload.email.trim().toLocaleLowerCase();

    const isUserExists = await prisma.user.findUnique({
        where: { email },
    });

    if (isUserExists) {
        throw new AppError(httpStatus.CONFLICT, "User Already Exists!");
    }

    const otpKey = `customer-registration-otp: ${email}`;

    const redisOtpValue = await redisClient.get(otpKey);

    if (!redisOtpValue) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Invalid OTP!");
    }

    if (redisOtpValue !== otp) {
        throw new AppError(httpStatus.UNAUTHORIZED, "OTP Does Not Match!");
    }

    await redisClient.del(otpKey);

    const customerRegistrationKey = `customer-registration-payload: ${email}`;

    const redisCustomerData = await redisClient.get(customerRegistrationKey);
    if (!redisCustomerData) {
        throw new AppError(httpStatus.BAD_REQUEST, "Invalid Customer Data!");
    }

    const customerPayload: ICustomerEmailVerifiyPayload =
        JSON.parse(redisCustomerData);

    const createdCustomer = await prisma.user.create({
        data: {
            name: customerPayload.name,
            email: customerPayload.email,
            passwordHash: customerPayload.hashedPassword,
            emailVerified: true,
            role: Role.CUSTOMER,
            status: UserStatus.ACTIVE,
            customerProfile: {
                create: {
                    name: customerPayload.name,
                    email: customerPayload.email,
                    meterNumber: customerPayload.customerProfile.meterNumber,
                },
            },
        },
        omit: { passwordHash: true },
        include: { customerProfile: true },
    });

    await redisClient.del(customerRegistrationKey);

    const templatePath = path.join(
        process.cwd(),
        "src/app/templates/welcome-email.ejs",
    );

    const templateData = {
        name: createdCustomer.name,
    };

    const htmlTemplate = await ejs.renderFile(templatePath, templateData);

    await transporter.sendMail({
        from: config.email_sender,
        to: email,
        subject: "Welcome to Load Shedding and Power Management System",
        html: htmlTemplate,
    });

    const { customerProfile: customer, ...user } = createdCustomer;

    const tokenPayload = {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
    };

    const accessToken = jwtUtils.createToken(
        tokenPayload,
        config.jwt_access_secret,
        config.jwt_access_expires_in as SignOptions,
    );

    const refreshToken = jwtUtils.createToken(
        tokenPayload,
        config.jwt_refresh_secret,
        config.jwt_refresh_expires_in as SignOptions,
    );

    return {
        user,
        customer,
        accessToken,
        refreshToken,
    };
};

// ==================================================
// Login as Registered User
// ==================================================
const loginUser = async (payload: IUserLoginPayload) => {
    const password = payload.password;

    const email = payload.email.trim().toLocaleLowerCase();

    const isUserExists = await prisma.user.findUnique({
        where: { email },
    });

    if (!isUserExists) {
        throw new AppError(httpStatus.NOT_FOUND, "User Not Found!");
    }

    if (!isUserExists.emailVerified) {
        throw new AppError(httpStatus.BAD_REQUEST, "Email Not Varified!");
    }

    if (isUserExists.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "User Is Deleted!");
    }

    if (isUserExists.status === UserStatus.BLOCKED) {
        throw new AppError(httpStatus.FORBIDDEN, "User Is Blocked!");
    }

    // Logic for Google Login

    const isPasswordMatched = await bcryptjs.compare(
        password,
        isUserExists.passwordHash,
    );

    if (!isPasswordMatched) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Invalid Credentials!");
    }

    const tokenPayload = {
        userId: isUserExists.id,
        name: isUserExists.name,
        email: isUserExists.email,
        role: isUserExists.role,
    };

    const accessToken = jwtUtils.createToken(
        tokenPayload,
        config.jwt_access_secret,
        config.jwt_access_expires_in as SignOptions,
    );

    const refreshToken = jwtUtils.createToken(
        tokenPayload,
        config.jwt_refresh_secret,
        config.jwt_refresh_expires_in as SignOptions,
    );

    return {
        accessToken,
        refreshToken,
    };
};
// ==================================================
// Token Generation for Expired Access Token
// ==================================================
const refreshToken = async (token: string) => {
    const verifyRefreshToken = jwtUtils.verifyToken(
        token,
        config.jwt_refresh_secret,
    );

    if (!verifyRefreshToken.success || !verifyRefreshToken.data) {
        throw new AppError(
            httpStatus.UNAUTHORIZED,
            config.node_env === "development"
                ? verifyRefreshToken.error
                : "Invalid Refresh Token!",
        );
    }

    const userData = verifyRefreshToken.data as JwtPayload;

    const isUserExists = await prisma.user.findUnique({
        where: { id: userData.userId },
    });

    if (!isUserExists) {
        throw new AppError(httpStatus.NOT_FOUND, "User Not Found!");
    }

    if (!isUserExists.emailVerified) {
        throw new AppError(httpStatus.BAD_REQUEST, "Email Not Varified!");
    }

    if (isUserExists.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "User Is Deleted!");
    }

    if (isUserExists.status === UserStatus.BLOCKED) {
        throw new AppError(httpStatus.FORBIDDEN, "User Is Blocked!");
    }

    const tokenPayload = {
        userId: isUserExists.id,
        name: isUserExists.name,
        email: isUserExists.email,
        role: isUserExists.role,
    };

    const accessToken = jwtUtils.createToken(
        tokenPayload,
        config.jwt_access_secret,
        config.jwt_access_expires_in as SignOptions,
    );

    const refreshToken = jwtUtils.createToken(
        tokenPayload,
        config.jwt_refresh_secret,
        config.jwt_refresh_expires_in as SignOptions,
    );

    return {
        accessToken,
        refreshToken,
    };
};

// ==================================================
// Get User Profile For Logged In User
// ==================================================
const getMe = async (user: IRequestUser) => {
    const isUserExists = await prisma.user.findUnique({
        where: { id: user.userId },
        omit: { passwordHash: true },
        include: {
            customerProfile: true,
            technicianProfile: true,
            substationManager: true,
            zoneManager: true,
        },
    });

    if (!isUserExists) {
        throw new AppError(httpStatus.NOT_FOUND, "User Not Found!");
    }

    if (!isUserExists.emailVerified) {
        throw new AppError(httpStatus.BAD_REQUEST, "Email Not Varified!");
    }

    if (isUserExists.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "User Is Deleted!");
    }

    if (isUserExists.status === UserStatus.BLOCKED) {
        throw new AppError(httpStatus.FORBIDDEN, "User Is Blocked!");
    }

    return isUserExists;
};

export const AuthService = {
    registerCustomer,
    emailVerification,
    loginUser,
    refreshToken,
    getMe,
};
