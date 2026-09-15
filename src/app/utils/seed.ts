import bcrypt from "bcryptjs";
import { Role } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import config from "../config/index.js";
import { AppError } from "./AppError.js";
import httpStatus from "http-status";

// ==================================================
// Seed Zone Manager Data
// ==================================================
export const seedZoneManager = async () => {
    try {
        const zone = await prisma.zone.findFirst({});

        if (!zone) {
            throw new AppError(
                httpStatus.NOT_FOUND,
                "Parent Zone ('Zone 01') not found. Seed Zone data first.",
            );
        }
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
                        employeeId: "ZM01",
                        zone: { connect: { id: zone.id } },
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
    const managerEmails = [
        config.substation01_manager_email,
        config.substation02_manager_email,
    ].filter(Boolean);

    try {
        // 1. Check if Substation Managers already exist
        const isSubstationManagerExists = await prisma.user.findFirst({
            where: { role: Role.SUBSTATION_MANAGER },
        });

        if (isSubstationManagerExists) {
            console.log("Substation Managers Already Exist.");
            return;
        }

        // 2. Validate Config Environment Variables
        const managersConfig = [
            {
                name: config.substation01_manager_name,
                email: config.substation01_manager_email,
                password: config.substation01_manager_password,
                employeeId: "Z01SSM01",
                subStationName: "subStaion01",
            },
            {
                name: config.substation02_manager_name,
                email: config.substation02_manager_email,
                password: config.substation02_manager_password,
                employeeId: "Z01SSM02",
                subStationName: "subStaion02",
            },
        ];

        for (const mgr of managersConfig) {
            if (!mgr.name || !mgr.email || !mgr.password) {
                throw new AppError(
                    httpStatus.INTERNAL_SERVER_ERROR,
                    "Substation Manager Name/Email/Password Missing in Config!",
                );
            }
        }

        // 3. Find parent Zone
        const zone = await prisma.zone.findFirst({
            where: { name: "Zone 01" },
        });

        if (!zone) {
            throw new AppError(
                httpStatus.NOT_FOUND,
                "Parent Zone ('Zone 01') not found. Seed Zone data first.",
            );
        }

        // 4. Seed each Substation Manager and link to Zone & Substation
        for (const mgr of managersConfig) {
            // Find matching Substation by name inside the Zone
            const subStation = await prisma.subStation.findFirst({
                where: {
                    name: mgr.subStationName,
                    zoneId: zone.id,
                },
            });

            if (!subStation) {
                throw new AppError(
                    httpStatus.NOT_FOUND,
                    `Substation '${mgr.subStationName}' not found in 'Zone 01'.`,
                );
            }

            const hashedPassword = await bcrypt.hash(
                mgr.password,
                Number(config.bcrypt_salt_round),
            );

            const createdUser = await prisma.user.create({
                data: {
                    name: mgr.name,
                    email: mgr.email,
                    passwordHash: hashedPassword,
                    emailVerified: true,
                    needPasswordChange: false,
                    role: Role.SUBSTATION_MANAGER,
                    subStationManager: {
                        create: {
                            name: mgr.name,
                            email: mgr.email,
                            employeeId: mgr.employeeId,
                            address: "Test Address",
                            zone: {
                                connect: { id: zone.id },
                            },
                            subStation: {
                                connect: { id: subStation.id },
                            },
                        },
                    },
                },
                include: {
                    subStationManager: true,
                },
            });

            // Update SubStation record with subStationManagerId if relation requires double-link
            await prisma.subStation.update({
                where: { id: subStation.id },
                data: {
                    subStationManagerId: createdUser.subStationManager?.id!,
                },
            });

            console.log(`✅ Substation Manager Created: ${createdUser.email}`);
        }
    } catch (error) {
        console.error("❌ Error Seeding Substation Manager:", error);

        // Safe cleanup using deleteMany
        if (managerEmails.length > 0) {
            await prisma.user.deleteMany({
                where: {
                    email: { in: managerEmails },
                },
            });
            console.log(
                "🧹 Safe cleanup executed for configured manager emails.",
            );
        }

        throw error;
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

type HouseMap = Record<string, string>;
type AreaMap = Record<string, HouseMap>;
type FeederMap = Record<string, AreaMap>;
type SubStationMap = Record<string, FeederMap>;

const zoneData: SubStationMap = {
    subStaion01: {
        feeder01: {
            area01: {
                house01: "HOUSE01-Z01SS01F01A01H01",
                house02: "HOUSE02-Z01SS01F01A01H02",
                house03: "HOUSE03-Z01SS01F01A01H03",
                house04: "HOUSE04-Z01SS01F01A04H04",
                house05: "HOUSE05-Z01SS01F01A01H05",
            },
            area02: {
                house01: "HOUSE06-Z01SS01F01A02H01",
                house02: "HOUSE07-Z01SS01F01A02H02",
                house03: "HOUSE08-Z01SS01F01A02H03",
                house04: "HOUSE09-Z01SS01F01A02H04",
                house05: "HOUSE10-Z01SS01F01A02H05",
            },
        },
        feeder02: {
            area03: {
                house01: "HOUSE11-Z01SS01F02A01H01",
                house02: "HOUSE12-Z01SS01F02A01H02",
                house03: "HOUSE13-Z01SS01F02A01H03",
                house04: "HOUSE14-Z01SS01F02A01H04",
                house05: "HOUSE15-Z01SS01F02A01H05",
            },
            area04: {
                house01: "HOUSE16-Z01SS01F02A02H01",
                house02: "HOUSE17-Z01SS01F02A02H02",
                house03: "HOUSE18-Z01SS01F02A02H03",
                house04: "HOUSE19-Z01SS01F02A02H04",
                house05: "HOUSE20-Z01SS01F02A02H05",
            },
        },
    },
    subStaion02: {
        feeder03: {
            area05: {
                house01: "HOUSE21-Z01SS02F01A01H01",
                house02: "HOUSE22-Z01SS02F01A01H02",
                house03: "HOUSE23-Z01SS02F01A01H03",
                house04: "HOUSE24-Z01SS02F01A01H04",
                house05: "HOUSE25-Z01SS02F01A01H05",
            },
            area06: {
                house01: "HOUSE26-Z01SS02F01A02H01",
                house02: "HOUSE27-Z01SS02F01A02H02",
                house03: "HOUSE28-Z01SS02F01A02H03",
                house04: "HOUSE29-Z01SS02F01A02H04",
                house05: "HOUSE30-Z01SS02F01A02H05",
            },
        },
        feeder04: {
            area07: {
                house01: "HOUSE31-Z01SS02F02A01H01",
                house02: "HOUSE32-Z01SS02F02A01H02",
                house03: "HOUSE33-Z01SS02F02A01H03",
                house04: "HOUSE34-Z01SS02F02A01H04",
                house05: "HOUSE35-Z01SS02F02A01H05",
            },
            area08: {
                house01: "HOUSE36-Z01SS02F02A02H01",
                house02: "HOUSE37-Z01SS02F02A02H02",
                house03: "HOUSE38-Z01SS02F02A02H03",
                house04: "HOUSE39-Z01SS02F02A02H04",
                house05: "HOUSE40-Z01SS02F02A02H05",
            },
        },
    },
};

export const seedZoneData = async () => {
    try {
        await prisma.$transaction(
            async (tx) => {
                const zoneName = "Zone 01";
                let zone = await tx.zone.findFirst({
                    where: { name: zoneName },
                });

                if (!zone) {
                    zone = await tx.zone.create({
                        data: { name: zoneName },
                    });
                }

                // SubStation Level
                for (const [subStationKey, feeders] of Object.entries(
                    zoneData,
                )) {
                    const subStationName = subStationKey;

                    let subStation = await tx.subStation.findFirst({
                        where: {
                            name: subStationName,
                            zoneId: zone.id,
                        },
                    });

                    if (!subStation) {
                        subStation = await tx.subStation.create({
                            data: {
                                name: subStationName,
                                zoneId: zone.id,
                            },
                        });
                    }

                    // Feeder Level (areas: AreaMap)
                    for (const [feederKey, areas] of Object.entries(feeders)) {
                        const feederName = feederKey;

                        let feeder = await tx.feeder.findFirst({
                            where: {
                                name: feederName,
                                substationId: subStation.id,
                            },
                        });

                        if (!feeder) {
                            feeder = await tx.feeder.create({
                                data: {
                                    name: feederName,
                                    zoneId: zone.id,
                                    substationId: subStation.id,
                                },
                            });
                        }

                        // Area Level (houses: HouseMap)
                        for (const [areaKey, houses] of Object.entries(areas)) {
                            const areaName = areaKey;

                            let area = await tx.area.findFirst({
                                where: {
                                    name: areaName,
                                    feederId: feeder.id,
                                },
                            });

                            if (!area) {
                                area = await tx.area.create({
                                    data: {
                                        name: areaName,
                                        zoneId: zone.id,
                                        substationId: subStation.id,
                                        feederId: feeder.id,
                                    },
                                });
                            }

                            // House Level (houseCode: string)
                            for (const [, houseCode] of Object.entries(
                                houses,
                            )) {
                                let house = await tx.house.findFirst({
                                    where: {
                                        name: houseCode,
                                        areaId: area.id,
                                    },
                                });

                                if (!house) {
                                    await tx.house.create({
                                        data: {
                                            name: houseCode,
                                            areaId: area.id,
                                            feederId: feeder.id,
                                            substationId: subStation.id,
                                            zoneId: zone.id,
                                        },
                                    });
                                }
                            }
                        }
                    }
                }
            },
            { maxWait: 10000, timeout: 30000 },
        );

        console.log("Hierarchical seeding by name completed successfully.");
    } catch (error) {
        console.error("Error seeding Zone Data:", error);
    }
};
