import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import httpStatus from "http-status";
import bcryptjs from "bcryptjs";
import config from "../../config/index.js";
import { redisClient } from "../../lib/redis.js";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer.js";
import {
    PaymentStatus,
    Role,
    UserStatus,
} from "../../../generated/prisma/enums.js";
import { jwtUtils } from "../../utils/jwt.js";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import type { IRequestUser } from "../../middleware/checkAuth.js";
import type { IRequestTokenPayload } from "./user.interface.js";
import crypto from "crypto";
import { getBkashIdToken } from "../../lib/bkash.js";

// ==================================================
// Request Recharge Token for Prepaid Meter
// ==================================================
const requestToken = async (
    payload: IRequestTokenPayload,
    user: IRequestUser,
) => {
    const transactionResult = await prisma.$transaction(async (tx) => {
        const customer = await prisma.customerProfile.findUnique({
            where: { userId: user.userId },
            include: {
                tokens: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: {
                        payment: true,
                        tokenSeqNo: true,
                        tokenStatus: true,
                    },
                },
            },
        });

        if (!customer || customer.isDeleted) {
            throw new AppError(
                httpStatus.NOT_FOUND,
                "Customer Profile Not Foun!",
            );
        }

        const existingToken = await prisma.token.findFirst({
            where: {
                userId: customer.userId,
                payment: { status: PaymentStatus.UNPAID },
            },
        });

        if (existingToken) {
            throw new AppError(
                httpStatus.BAD_REQUEST,
                "You have unpaid token. Please pay first.",
            );
        }

        const generateToken = (): string => {
            const randomArray = new Uint8Array(20);
            crypto.getRandomValues(randomArray);

            // Filter out values >= 250 to eliminate modulo bias (250 is 10 * 25)
            const digits: string[] = [];
            let i = 0;
            while (digits.length < 20) {
                // Top up buffer if exhausted
                const buf = new Uint8Array(20);
                crypto.getRandomValues(buf);
                for (const byte of buf) {
                    if (byte < 250 && digits.length < 20) {
                        digits.push((byte % 10).toString());
                    }
                }
            }

            const rawDigits = digits.join("");
            return (rawDigits.match(/.{1,4}/g) || []).join("-");
        };

        // Clean assignment (no redundant .toString())
        const rechargeTokenNo = generateToken();

        const rechargeToken = await tx.token.create({
            data: {
                meterNo: customer.meterNumber,
                rechargeAmount: payload.rechargeAmount,
                tokenNo: rechargeTokenNo,
                tokenSeqNo: (customer.tokens[0]?.tokenSeqNo ?? 0) + 1,
                customerId: customer.id,
                userId: customer.userId,
            },
        });

        const bkasIdToken = await getBkashIdToken();

        if (!bkasIdToken) {
            throw new AppError(
                httpStatus.BAD_GATEWAY,
                "No Bkash Access TOken Available!",
            );
        }

        const bkashCreatePaymentResponse = await fetch(
            `${config.bkash_base_url}/tokenized/checkout/create`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    Accept: "application/json",
                    Authorization: bkasIdToken,
                    "X-app-key": config.bkash_app_key,
                },
                body: JSON.stringify({
                    aggrementID: rechargeToken.id,
                    mode: "0011",
                    payerReference: customer.email,
                    callbackURL: `${config.bkash_base_callback_url}/token/recharge-token/payment/callback`,
                    amount: payload.rechargeAmount,
                    currency: "BDT",
                    intent: "sale",
                    merchantInvoiceNumber: rechargeToken.id,
                }),
            },
        );

        const bkashCreatePaymentResult =
            await bkashCreatePaymentResponse.json();

        await tx.payment.create({
            data: {
                amount: bkashCreatePaymentResult.amount,
                merchandInvoiceNumber:
                    bkashCreatePaymentResult.merchantInvoiceNumber,
                tokenId: rechargeToken.id,
                bkashPaymentId: bkashCreatePaymentResult.paymentID,
                payerReference: customer.email,
                gatewayResponse: bkashCreatePaymentResult,
            },
        });

        return { paymentUrl: bkashCreatePaymentResult.bkashURL };
    });

    return transactionResult;
};

export const UserServices = { requestToken };
