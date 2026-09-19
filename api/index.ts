import app from "../src/app.js";
import { prisma } from "../src/app/lib/prisma.js";
import { redisClient } from "../src/app/lib/redis.js";

let connected = false;

async function ensureConnections() {
    if (connected) return;
    await prisma.$connect();
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
    connected = true;
}

export default async function handler(req: any, res: any) {
    await ensureConnections();
    return app(req, res);
}
