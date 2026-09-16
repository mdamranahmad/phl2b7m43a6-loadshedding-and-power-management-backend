import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import httpStatus from "http-status";
import config from "../../config/index.js";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer.js";
import {
    MeterType,
    PaymentStatus,
    TokenStatus,
} from "../../../generated/prisma/enums.js";
import type { IRequestUser } from "../../middleware/checkAuth.js";
import type {
    IRechargeTokenPayload,
    IRequestTokenPayload,
} from "./user.interface.js";
import crypto from "crypto";
import { getBkashIdToken } from "../../lib/bkash.js";
import type { IQuery } from "../../interfaces/index.js";
import type {
    CustomerProfileWhereInput,
    TokenWhereInput,
} from "../../../generated/prisma/models.js";

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
        });

        if (!customer || customer.isDeleted) {
            throw new AppError(
                httpStatus.NOT_FOUND,
                "Customer Profile Not Foun!",
            );
        }

        const existingToken = await prisma.token.findFirst({
            where: {
                customerId: customer.id,
                payment: { status: PaymentStatus.UNPAID },
            },
        });

        if (existingToken) {
            throw new AppError(
                httpStatus.BAD_REQUEST,
                "You have unpaid token. Please pay first.",
            );
        }

        const getTokenSeqNo = await prisma.token.findMany({
            where: { customerId: customer.id },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { tokenSeqNo: true },
        });

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
                tokenSeqNo: (getTokenSeqNo[0]?.tokenSeqNo ?? 0) + 1,
                customerId: customer.id,
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
                    callbackURL: `${config.bkash_base_callback_url}/user/request-token/payment/callback`,
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
                merchantInvoiceNumber:
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

// ==================================================
// Bkash Callback Function for Request Token
// ==================================================
const requestTokenCallBack = async (query: Record<string, any>) => {
    const transactionResult = await prisma.$transaction(
        async (tx) => {
            const paymentID = query.paymentID;

            if (!paymentID) {
                throw new AppError(
                    httpStatus.BAD_REQUEST,
                    "Payment Id Not Available!",
                );
            }

            const status = query.status;

            if (!status) {
                throw new AppError(
                    httpStatus.BAD_REQUEST,
                    "Payment Status Not Available!",
                );
            }

            const bkashIdToken = await getBkashIdToken();

            if (!bkashIdToken) {
                throw new AppError(
                    httpStatus.BAD_REQUEST,
                    "Bkash Access Token Not Available!",
                );
            }

            const executedPaymentResponse = await fetch(
                `${config.bkash_base_url}/tokenized/checkout/execute`,
                {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        Accept: "application/json",
                        Authorization: bkashIdToken,
                        "X-App-Key": config.bkash_app_key,
                    },
                    body: JSON.stringify({ paymentID }),
                },
            );

            const executedPaymentResult = await executedPaymentResponse.json();

            if (status === "success") {
                const token = await prisma.token.findUnique({
                    where: { id: executedPaymentResult.merchantInvoiceNumber },
                    include: {
                        payment: true,
                        customer: true,
                    },
                });

                if (!token) {
                    throw new AppError(
                        httpStatus.NOT_FOUND,
                        "Requested Token Not Found!",
                    );
                }

                await tx.payment.update({
                    where: {
                        tokenId: executedPaymentResult.merchantInvoiceNumber,
                        bkashPaymentId: paymentID,
                    },
                    data: {
                        bkashTrxId: executedPaymentResult.trxID,
                        status: PaymentStatus.PAID,
                        paidAt: executedPaymentResult.paymentExecuteTime,
                        gatewayResponse: executedPaymentResult,
                    },
                });

                const templatePath = path.join(
                    process.cwd(),
                    "src/app/templates/customer-request-token.ejs",
                );

                const templateData = {
                    name: token.customer.name,
                    prepaidToken: token.tokenNo,
                    seqNo: token.tokenSeqNo,
                    meterNo: token.meterNo,
                    rechargeAmount: token.rechargeAmount,
                };

                const htmlTemplate = await ejs.renderFile(
                    templatePath,
                    templateData,
                );

                await transporter.sendMail({
                    from: config.email_sender,
                    to: token.customer.email,
                    subject: "Token Request Successful!",
                    html: htmlTemplate,
                });
                return {
                    redirectUrl: `${config.frontend_url}/dashboard/my-tokens?status=success`,
                };
            } else if (status === "failure") {
                await tx.payment.update({
                    where: {
                        bkashPaymentId: paymentID,
                    },
                    data: {
                        status: PaymentStatus.FAILED,
                        gatewayResponse: executedPaymentResult,
                    },
                });
                return {
                    redirectUrl: `${config.frontend_url}/dashboard/my-tokens?status=failure`,
                };
            } else if (status === "cancel") {
                await tx.payment.update({
                    where: {
                        bkashPaymentId: paymentID,
                    },
                    data: {
                        status: PaymentStatus.CANCELLED,
                        gatewayResponse: executedPaymentResult,
                    },
                });
                return {
                    redirectUrl: `${config.frontend_url}/dashboard/my-tokens?status=cancel`,
                };
            } else {
                return {
                    executedPaymentResult,
                    redirectUrl: `${config.frontend_url}/dashboard/my-tokens?error=payment-failed`,
                };
            }
        },
        {
            maxWait: 5000, // Max time prisma waits to acquire a transaction lock (default 2000ms)
            timeout: 15000, // Max transaction execution time in ms
        },
    );

    return transactionResult;
};

// ==================================================
// Recharge Token
// ==================================================
const rechargeToken = async (
    payload: IRechargeTokenPayload,
    user: IRequestUser,
) => {
    const customer = await prisma.customerProfile.findUnique({
        where: { userId: user.userId },
    });

    if (!customer || customer.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "Customer Profile Not Foun!");
    }

    const isTokenExists = await prisma.token.findFirst({
        where: {
            tokenNo: payload.TokenNo,
            meterNo: customer.meterNumber,
            tokenStatus: TokenStatus.UNUSED,
            payment: { status: PaymentStatus.PAID },
        },
    });

    if (!isTokenExists) {
        throw new AppError(httpStatus.NOT_FOUND, "Invalid Token Number!");
    }

    const usedToken = await prisma.token.update({
        where: { id: isTokenExists.id },
        data: { tokenStatus: TokenStatus.USED },
    });

    return usedToken;
};

// ==================================================
// Get Token History for Prepaid Meter
// ==================================================
const getMyTokens = async (query: IQuery, user: IRequestUser) => {
    const customer = await prisma.customerProfile.findUnique({
        where: { userId: user.userId, isDeleted: false },
        select: {
            id: true,
        },
    });

    if (!customer) {
        throw new AppError(httpStatus.NOT_FOUND, "Customer Profile Not Found!");
    }

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const andConditions: TokenWhereInput[] = [];

    // Searching
    if (query.searchTerm) {
        andConditions.push({
            OR: [
                {
                    meterNo: {
                        contains: query.searchTerm,
                        mode: "insensitive",
                    },
                },
            ],
        });
    }

    // Filtering
    if (query.meterType) {
        andConditions.push({
            meterType: query.meterType,
        });
    }

    if (query.status) {
        andConditions.push({ payment: { status: query.status } });
    }

    // Default Filter Conditions
    andConditions.push({ customerId: customer.id });

    const allTokens = await prisma.token.findMany({
        where: { AND: andConditions },
        take: limit,
        skip,
        orderBy: { [sortBy]: sortOrder },
        include: {
            payment: { select: { amount: true, status: true } },
        },
    });

    const totalTokenCount = await prisma.token.count({
        where: { AND: andConditions },
    });

    return {
        data: allTokens,
        meta: {
            page,
            limit,
            total: totalTokenCount,
            totalPages: Math.ceil(totalTokenCount / limit),
        },
    };
};

// ==================================================
// Payment for Unpaid Token for Prepaid Meter
// ==================================================
const payUnPaidToken = async (tokenId: string, user: IRequestUser) => {
    const transactionResult = await prisma.$transaction(async (tx) => {
        const customer = await tx.customerProfile.findUnique({
            where: { userId: user.userId, isDeleted: false },
        });

        if (!customer) {
            throw new AppError(
                httpStatus.NOT_FOUND,
                "Customer Profile Not Foun!",
            );
        }

        const isTokenExists = await tx.token.findFirst({
            where: {
                id: tokenId,
                tokenStatus: TokenStatus.UNUSED,
            },
            include: { payment: { select: { status: true, amount: true } } },
        });

        if (!isTokenExists) {
            throw new AppError(httpStatus.NOT_FOUND, "Token Not Found!");
        }

        if (isTokenExists.payment?.status === PaymentStatus.PAID) {
            throw new AppError(httpStatus.BAD_REQUEST, "Token Already Paid!");
        }

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
                    aggrementID: isTokenExists.id,
                    mode: "0011",
                    payerReference: customer.email,
                    callbackURL: `${config.bkash_base_callback_url}/user/request-token/payment/callback`,
                    amount: isTokenExists.payment?.amount,
                    currency: "BDT",
                    intent: "sale",
                    merchantInvoiceNumber: isTokenExists.id,
                }),
            },
        );

        const bkashCreatePaymentResult =
            await bkashCreatePaymentResponse.json();

        await tx.payment.update({
            where: { tokenId: isTokenExists.id },
            data: {
                amount: bkashCreatePaymentResult.amount,
                merchantInvoiceNumber:
                    bkashCreatePaymentResult.merchantInvoiceNumber,
                tokenId: isTokenExists.id,
                bkashPaymentId: bkashCreatePaymentResult.paymentID,
                payerReference: customer.email,
                gatewayResponse: bkashCreatePaymentResult,
            },
        });

        return { paymentUrl: bkashCreatePaymentResult.bkashURL };
    });

    return transactionResult;
};

export const UserServices = {
    requestToken,
    requestTokenCallBack,
    rechargeToken,
    payUnPaidToken,
    getMyTokens,
};
