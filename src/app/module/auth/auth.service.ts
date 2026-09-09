import { prisma } from "../../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { ICustomerRegisterPayload } from "./auth.interface.js";
import httpStatus from "http-status";
import bcryptjs from "bcryptjs";
import config from "../../config/index.js";
import crypto from "crypto";
import { redisClient } from "../../../lib/redis.js";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../../lib/nodemailer.js";

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

const emailVerification = async (payload: any) => {}

export const AuthService = {
    registerCustomer,
    emailVerification,
};
