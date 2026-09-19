import { Router } from "express";
import { auth } from "../../middleware/checkAuth.js";
import { Role } from "../../../generated/prisma/enums.js";
import { AnalyticsController } from "./analytics.controller.js";

const router = Router();

router.get(
    "/zonal-manager-analytics",
    auth(Role.ZONE_MANAGER),
    AnalyticsController.getZonalManagerAnalytics,
);

router.get(
    "/substation-manager-analytics",
    auth(Role.SUBSTATION_MANAGER),
    AnalyticsController.getSubStationlManagerAnalytics,
);

router.get(
    "/technician-analytics",
    auth(Role.TECHNICIAN),
    AnalyticsController.getTechnicianAnalytics,
);

router.get(
    "/customer-analytics",
    auth(Role.CUSTOMER),
    AnalyticsController.getCustomerAnalytics,
);

export const AnalyticsRoutes = router;
