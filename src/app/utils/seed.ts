import bcrypt from "bcryptjs";
import { Role } from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { config } from "../config/index.js";
import { AppError } from "./AppError.js";
import httpStatus from "http-status";

// ==================================================
// Seed Zone Manager Data
// ==================================================
export const seedZoneManager = async () => {
    try {
        // Check if Zone Manager already exists
        const isZoneManagerExists = await prisma.user.findFirst({
            where: { role: Role.ZONE_MANAGER },
        });

        if (isZoneManagerExists) {
            console.log("Zone Manager Already Exists.");
            return;
        }

        const name = config.zone_manager_name;
        const email = config.zone_manager_email;
        const password = config.zone_manager_password;

        if (!name || !email || !password) {
            throw new AppError(
                httpStatus.INTERNAL_SERVER_ERROR,
                "Zone Manger Name/ Email/ Password Not Found!",
            );
        }

        const hashedPassword = await bcrypt.hash(
            password,
            Number(config.bcrypt_salt_round),
        );

        // Seeding Zone Manager Data in Database
        const zoneManager = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash: hashedPassword,
                emailVerified: true,
                needPasswordChange: false,
                role: Role.ZONE_MANAGER,
                zoneManager: {
                    create: {
                        name,
                        email,
                        address: "Test Addredd",
                        employeId: "ZM01",
                        zoneId: "Z01",
                    },
                },
            },
        });

        console.log("Zone Manager Created: ", zoneManager);
    } catch (error) {
        console.log("Error Seeding Zone Manager: ", error);

        // Cleanup for incomplete or corrupted seeding operation
        await prisma.user.delete({
            // PROBELM: delete may cause "Record to delete does not exists" of there is not data to delete, deleteMany is better to use
            where: { email: config.zone_manager_email },
        });
    }
};

// ==================================================
// Seed Substation Manager Data
// ==================================================
export const seedSubstationManager = async () => {
    try {
        // Check if Zone Manager already exists
        const isSubstationManagerExists = await prisma.user.findFirst({
            where: { role: Role.SUBSTATION_MANAGER },
        });

        if (isSubstationManagerExists) {
            console.log("Substation Manager Already Exists.");
            return;
        }

        const name = config.substation_manager_name;
        const email = config.substation_manager_email;
        const password = config.substation_manager_password;

        if (!name || !email || !password) {
            throw new AppError(
                httpStatus.INTERNAL_SERVER_ERROR,
                "Substation Manger Name/ Email/ Password Not Found!",
            );
        }

        const hashedPassword = await bcrypt.hash(
            password,
            Number(config.bcrypt_salt_round),
        );

        // Seeding Substation Manager Data in Database
        const SubstationManager = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash: hashedPassword,
                emailVerified: true,
                needPasswordChange: false,
                role: Role.SUBSTATION_MANAGER,
                substationManager: {
                    create: {
                        name,
                        email,
                        employeId: "Z01ZM01",
                        address: "Test Address",
                        substationId: "Z01SS01",
                        zoneId: "Z01",
                    },
                },
            },
        });

        console.log("Substation Manager Created: ", SubstationManager);
    } catch (error) {
        console.log("Error Seeding Substation Manager: ", error);

        // Cleanup for incomplete or corrupted seeding operation
        await prisma.user.delete({
            // PROBELM: delete may cause "Record to delete does not exists" of there is not data to delete, deleteMany is better to use
            where: { email: config.substation_manager_email },
        });
    }
};

// ==================================================
// Seed Tester Technician Data
// ==================================================
export const seedTesterTechnician = async () => {
    try {
        // Check if Zone Manager already exists
        const isTesterTechnicianExists = await prisma.user.findFirst({
            where: { role: Role.TECHNICIAN },
        });

        if (isTesterTechnicianExists) {
            console.log("Tester Technician Already Exists.");
            return;
        }

        const name = config.tester_technician_name;
        const email = config.tester_technician_email;
        const password = config.tester_technician_password;

        if (!name || !email || !password) {
            throw new AppError(
                httpStatus.INTERNAL_SERVER_ERROR,
                "Tester Technician Name/ Email/ Password Not Found!",
            );
        }

        const hashedPassword = await bcrypt.hash(
            password,
            Number(config.bcrypt_salt_round),
        );

        // Seeding Tester Technician Data in Database
        const testerTechnician = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash: hashedPassword,
                emailVerified: true,
                needPasswordChange: false,
                role: Role.TECHNICIAN,
                technicianProfile: {
                    create: {
                        name,
                        email,
                        address: "Test Address",
                        experienceYear: 3,
                        expertise: "Test",
                    },
                },
            },
        });

        console.log("Tester Technician Created: ", testerTechnician);
    } catch (error) {
        console.log("Error Tester Technician: ", error);

        // Cleanup for incomplete or corrupted seeding operation
        await prisma.user.delete({
            // PROBELM: delete may cause "Record to delete does not exists" of there is not data to delete, deleteMany is better to use
            where: { email: config.tester_technician_email },
        });
    }
};
