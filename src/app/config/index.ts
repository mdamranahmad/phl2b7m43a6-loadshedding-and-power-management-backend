import dotenv from "dotenv"
import path from "node:path"

dotenv.config({path: path.join(process.cwd(), ".env")})

export const config = {
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
    database_url: process.env.DATABASE_URL!,
}