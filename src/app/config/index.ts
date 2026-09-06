import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export const config = {
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
    database_url: process.env.DATABASE_URL!,
    backend_url: process.env.BACKEND_URL!,
    frontend_url: process.env.FRONTEND_URL!,
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
};
