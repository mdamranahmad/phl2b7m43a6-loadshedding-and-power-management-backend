import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
    database_url: process.env.DATABASE_URL!,
    backend_url: process.env.BACKEND_URL!,
    frontend_url: process.env.FRONTEND_URL!,
    jwt_access_secret: process.env.JWT_ACCESS_SECRET!,
    jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN!,
    jwt_refresh_secret: process.env.JWT_REFRESH_SECRET!,
    jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN!,
    bcrypt_salt_round: process.env.BCRYPT_SALT_ROUNDS!,
    zone_manager_name: process.env.ZONE_MANAGER_NAME!,
    zone_manager_email: process.env.ZONE_MANAGER_EMAIL!,
    zone_manager_password: process.env.ZONE_MANAGER_PASSWORD!,
    substation_manager_name: process.env.SUBSTATION_MANAGER_NAME!,
    substation_manager_email: process.env.SUBSTATION_MANAGER_EMAIL!,
    substation_manager_password: process.env.SUBSTATION_MANAGER_PASSWORD!,
    tester_technician_name: process.env.TESTER_TECHNICIAN_NAME!,
    tester_technician_email: process.env.TESTER_TECHNICIAN_EMAIL!,
    tester_technician_password: process.env.TESTER_TECHNICIAN_PASSWORD!,
    redis_username: process.env.REDIS_USERNAME!,
    redis_password: process.env.REDIS_PASSWORD!,
    redis_host: process.env.REDIS_HOST!,
    redis_port: process.env.REDIS_PORT!,
    smtp_user: process.env.SMTP_USER!,
    smtp_password: process.env.SMTP_PASSWORD!,
    email_sender: process.env.EMAIL_SENDER!,
    cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    cloudinary_api_key: process.env.CLOUDINARY_API_KEY!,
    cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET!,
};
