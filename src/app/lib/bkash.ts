import { AppError } from "../utils/AppError.js";
import httpStatus from "http-status";
import { redisClient } from "./redis.js";
import config from "../config/index.js";

export const getBkashIdToken = async () => {
    try {
        const idTokenKey = "bkash:idToken";
        const refreshTokenKey = "bkash:refreshToken";

        let bkashIdToken = await redisClient.get(idTokenKey);
        const bkashRefreshToken = await redisClient.get(refreshTokenKey);

        const bkashIdTokenTTL = await redisClient.ttl(idTokenKey);
        const bkashRefreshTokenTTL = await redisClient.ttl(refreshTokenKey);

        if (
            (bkashIdTokenTTL <= 600 || !bkashIdToken) &&
            bkashRefreshToken &&
            bkashRefreshTokenTTL > 600
        ) {
            const refreshTokenResponse = await fetch(
                `${config.bkash_base_url}/tokenized/checkout/token/refresh`,
                {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        Accept: "application/json",
                        username: config.bkash_user_name,
                        password: config.bkash_password,
                    },
                    body: JSON.stringify({
                        app_key: config.bkash_app_key,
                        app_secret: config.bkash_app_secret,
                        refresh_token: bkashRefreshToken,
                    }),
                },
            );
            if (!refreshTokenResponse.ok) {
                throw new AppError(
                    httpStatus.BAD_GATEWAY,
                    "Bkash Access Token Grant Failed!",
                );
            }

            const bkashRefreshTokenResult = await refreshTokenResponse.json();

            bkashIdToken = bkashRefreshTokenResult.id_token;

            await redisClient.set(idTokenKey, bkashIdToken as string, {
                expiration: { type: "EX", value: 60 * 60 },
            });

            return bkashIdToken;
        }

        if (bkashIdTokenTTL > 600) {
            // Check if id_token is present in redis
            return bkashIdToken;
        }

        // Generation of id_token and refresh_token from bkash
        const response = await fetch(
            `${config.bkash_base_url}/tokenized/checkout/token/grant`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    Accept: "application/json",
                    username: config.bkash_user_name,
                    password: config.bkash_password,
                },
                body: JSON.stringify({
                    app_key: config.bkash_app_key,
                    app_secret: config.bkash_app_secret,
                }),
            },
        );

        if (!response.ok) {
            throw new AppError(
                httpStatus.BAD_GATEWAY,
                "Bkash Access Token Grant Failed!",
            );
        }

        console.log("response: ", response);
        const result = await response.json();

        console.log("result: ", result);

        // Store generated token in redis
        await redisClient.set(idTokenKey, result.id_token, {
            expiration: { type: "EX", value: 60 * 60 },
        });

        // Store generated refresh token in redis
        await redisClient.set(refreshTokenKey, result.refresh_token, {
            expiration: {
                type: "EX",
                value: 60 * 60 * 24 * 28,
            },
        });

        bkashIdToken = result.id_token;

        return bkashIdToken;
    } catch (error: any) {
        throw new AppError(httpStatus.BAD_GATEWAY, error.message);
    }
};
