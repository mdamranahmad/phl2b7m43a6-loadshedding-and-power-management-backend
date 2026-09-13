import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import httpStatus from "http-status";
import bcryptjs from "bcryptjs";
import config from "../../config/index.js";
import crypto from "crypto";
import { redisClient } from "../../lib/redis.js";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer.js";
import {
    Role,
    TechnicianVerificationStatus,
    UserStatus,
} from "../../../generated/prisma/enums.js";
import type { IRequestUser } from "../../middleware/checkAuth.js";
import type {
    IApplyTechnicianPayload,
    IApproveTechnicianPayload,
} from "./technician.interface.js";
import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary.js";
import type { ICustomerEmailVerificationPayload } from "../auth/auth.interface.js";
import type { IQuery } from "../../interfaces/index.js";
import type { TechnicianProfileWhereInput } from "../../../generated/prisma/models.js";

// ==================================================
// Register User as Technician
// ==================================================
const registerTechnician = async (
    payload: IApplyTechnicianPayload,
    resume: Express.Multer.File,
) => {
    const email = payload.email.trim().toLocaleLowerCase();

    const isUserExists = await prisma.user.findUnique({
        where: { email },
    });

    if (isUserExists) {
        throw new AppError(httpStatus.CONFLICT, "User Already Exists!");
    }

    // Upload Resume in Cloudinary
    const resumeUploadResult = await new Promise<UploadApiResponse>(
        (resolve, reject) => {
            cloudinary.uploader
                .upload_stream(
                    { resource_type: "auto" },
                    // { resource_type: "raw" },
                    async (error, result) => {
                        if (error) {
                            console.error(
                                "Cloudinary Full Error Response: ",
                                error,
                            );
                            return reject(error);
                        }

                        if (!result) {
                            return reject(
                                new Error(
                                    "No result returned from Cloudinary!",
                                ),
                            );
                        }
                        resolve(result);
                    },
                )
                .end(resume.buffer);
        },
    );

    const hashedPassword = await bcryptjs.hash(
        payload.password,
        Number(config.bcrypt_salt_round),
    );

    // Upload Technician Data in Database
    const technicianApplication = await prisma.user.create({
        data: {
            name: payload.name,
            email: email,
            passwordHash: hashedPassword,
            needPasswordChange: true,
            role: payload.role,
            technicianProfile: {
                create: {
                    name: payload.name,
                    email: email,
                    address: payload.address,
                    experienceYear: payload.experienceYear,
                    expertise: payload.expertise,
                    resumeUrl: resumeUploadResult.secure_url,
                    resumePublicId: resumeUploadResult.public_id,
                },
            },
        },
        omit: { passwordHash: true },
        include: { technicianProfile: true },
    });

    // Temporary OTP in Redis
    const expirationSeconds = 5 * 60;

    const otpKey = `technician-application-otp: ${email}`;
    const otpValue = crypto.randomInt(100000, 1000000).toString();

    await redisClient.set(otpKey, otpValue, {
        expiration: { type: "EX", value: expirationSeconds },
    });

    // Email Notification for OTP
    const templatePath = path.join(
        process.cwd(),
        "src/app/templates/registration-user-otp.ejs",
    );

    const templateData = {
        name: payload.name,
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

    return technicianApplication;
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
        where: { email, role: Role.TECHNICIAN },
    });

    if (!isUserExists) {
        throw new AppError(
            httpStatus.CONFLICT,
            "Technician Application Not Found!",
        );
    }

    if (isUserExists?.emailVerified) {
        throw new AppError(httpStatus.CONFLICT, "Email Already Verified!");
    }

    const otpKey = `technician-application-otp: ${email}`;

    const redisOtpValue = await redisClient.get(otpKey);

    if (!redisOtpValue) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Invalid OTP!");
    }

    if (redisOtpValue !== otp) {
        throw new AppError(httpStatus.UNAUTHORIZED, "OTP Does Not Match!");
    }

    await redisClient.del(otpKey);

    const verifiedTechnician = await prisma.user.update({
        where: { id: isUserExists.id },
        data: { emailVerified: true },
        omit: { passwordHash: true },
        include: { technicianProfile: true },
    });

    return verifiedTechnician;
};

// ==================================================
// Approval or Rejection of Technician Application
// ==================================================
const approveTechnician = async (
    payload: IApproveTechnicianPayload,
    reviewer: IRequestUser,
) => {
    const { technicianId, verificationStatus, rejectReason } = payload;

    const isTechnicianExists = await prisma.technicianProfile.findUnique({
        where: { id: technicianId },
        include: { user: { omit: { passwordHash: true } } },
    });

    if (!isTechnicianExists) {
        throw new AppError(
            httpStatus.NOT_FOUND,
            "Technician Application Not Found!",
        );
    }

    if (!isTechnicianExists?.user.emailVerified) {
        throw new AppError(httpStatus.BAD_REQUEST, "Email Not Verified!");
    }

    if (isTechnicianExists?.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "Technician Profile Deleted!");
    }

    if (isTechnicianExists?.user.status !== UserStatus.ACTIVE) {
        throw new AppError(httpStatus.CONFLICT, "User is not Active!");
    }

    if (
        isTechnicianExists?.verificationStatus !==
        TechnicianVerificationStatus.PENDING
    ) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            `Technician application has already been ${isTechnicianExists.verificationStatus.toLocaleLowerCase()}`,
        );
    }

    if (
        verificationStatus === TechnicianVerificationStatus.REJECTED &&
        !rejectReason
    ) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            "Rejection reason required to reject a technician application.",
        );
    }

    const updateTechnician = await prisma.technicianProfile.update({
        where: { id: technicianId },
        data: {
            verificationStatus,
            rejectionReason:
                verificationStatus === TechnicianVerificationStatus.REJECTED
                    ? rejectReason
                    : null,
            reviewedBy: reviewer.userId,
            reviewedAt: new Date(),
        },
    });

    const isApproved =
        verificationStatus === TechnicianVerificationStatus.APPROVED;

    const templatePath = path.join(
        process.cwd(),
        `src/app/templates/${isApproved ? "technician-application-approved.ejs" : "technician-application-rejected.ejs"}`,
    );

    const templateData = {
        name: updateTechnician.name,
        reason: updateTechnician.rejectionReason,
    };

    const htmlTemplate = await ejs.renderFile(templatePath, templateData);

    await transporter.sendMail({
        from: config.email_sender,
        to: updateTechnician.email,
        subject: `Your Technician Application Has Been ${isApproved ? "Approved" : "Rejected"}!`,
        html: htmlTemplate,
    });

    return updateTechnician;
};

// ==================================================
// Get All Technician
// ==================================================
const getAllTechnician = async (query: IQuery) => {
    // Search, Sort, Filter, Pagination
    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const andConditions: TechnicianProfileWhereInput[] = [];

    // Searching
    if (query.searchTerm) {
        andConditions.push({
            OR: [
                { name: { contains: query.searchTerm, mode: "insensitive" } },
                { email: { contains: query.searchTerm, mode: "insensitive" } },
                {
                    address: {
                        contains: query.searchTerm,
                        mode: "insensitive",
                    },
                },
                {
                    contactNumber: {
                        contains: query.searchTerm,
                        mode: "insensitive",
                    },
                },
                {
                    expertise: {
                        contains: query.searchTerm,
                        mode: "insensitive",
                    },
                },
            ],
        });
    }

    // Filtering
    if (query.verificationStatus) {
        andConditions.push({ verificationStatus: query.verificationStatus });
    }

    if (query.expertise) {
        andConditions.push({ expertise: query.expertise });
    }

    if (query.reviewedBy) {
        andConditions.push({ reviewedBy: query.reviewedBy });
    }

    if (query.isAvailable) {
        andConditions.push({ isAvailable: query.isAvailable });
    }

    // Default Filter Conditions
    andConditions.push({ isDeleted: false });

    const allTechnicians = await prisma.technicianProfile.findMany({
        where: { AND: andConditions },
        take: limit,
        skip,
        orderBy: { [sortBy]: sortOrder },
        include: { user: { omit: { passwordHash: true } } },
    });

    const totalTechnicianCount = await prisma.technicianProfile.count({
        where: { AND: andConditions },
    });

    return {
        data: allTechnicians,
        meta: {
            page,
            limit,
            total: totalTechnicianCount,
            totalPages: Math.ceil(totalTechnicianCount / limit),
        },
    };
};

// ==================================================
// Get Technician Profile By Technician Id
// ==================================================
const getTechnicianProfile = async (technicianId: string) => {
    const isTechnicianExists = await prisma.technicianProfile.findUnique({
        where: { id: technicianId },
        include: { user: { omit: { passwordHash: true } } },
    });

    if (!isTechnicianExists) {
        throw new AppError(
            httpStatus.NOT_FOUND,
            "Technician Profile Not Found!",
        );
    }

    return isTechnicianExists;
};

export const TechnicianService = {
    registerTechnician,
    emailVerification,
    approveTechnician,
    getAllTechnician,
    getTechnicianProfile,
};
