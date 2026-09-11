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
import { Role, UserStatus } from "../../../generated/prisma/enums.js";
import { jwtUtils } from "../../utils/jwt.js";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import type { IRequestUser } from "../../middleware/checkAuth.js";
import type { IApplyTechnicianPayload } from "./technician.interface.js";
import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary.js";

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
    console.log(111111111111111);
    const resumeUploadResult = await new Promise<UploadApiResponse>(
        (resolve, reject) => {
            cloudinary.uploader
                .upload_stream(
                    // { resource_type: "auto" },
                    { resource_type: "raw" },
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

    console.log(2222222222);

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

export const TechnicianService = { registerTechnician };
