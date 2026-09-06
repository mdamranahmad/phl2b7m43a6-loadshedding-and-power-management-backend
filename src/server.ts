import app from "./app.js";
import { config } from "./app/config/index.js";
import {
    seedSubstationManager,
    seedTesterTechnician,
    seedZoneManager,
} from "./app/utils/seed.js";
import { prisma } from "./lib/prisma.js";

const port = config.port;

const main = async () => {
    try {
        await prisma.$connect();
        await seedZoneManager();
        await seedSubstationManager();
        await seedTesterTechnician();
        console.log("Connected to the database successfully!");
        app.listen(port, () => {
            console.log(`Server is running on port ${port}!`);
        });
    } catch (error) {
        console.log("Error starting the server: ", error);
        await prisma.$disconnect();
        process.exit(1);
    }
};

main();
