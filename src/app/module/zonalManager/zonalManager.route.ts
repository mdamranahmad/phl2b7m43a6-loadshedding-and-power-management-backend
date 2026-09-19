import { Router } from "express";
import { auth } from "../../middleware/checkAuth.js";
import { Role } from "../../../generated/prisma/enums.js";
import { ZonalManagerController } from "./zonalManager.controller.js";

const router = Router();

router.get(
    "/get-outage-reports",
    auth(Role.ZONE_MANAGER),
    ZonalManagerController.getOutageReports,
);

router.get(
    "/get-outage-reports/:outageReportId",
    auth(Role.ZONE_MANAGER),
    ZonalManagerController.getOutageReportById,
);

router.post(
    "/get-outage-reports/:outageReportId",
    auth(Role.ZONE_MANAGER),
    ZonalManagerController.approveOutageReport,
);

export const ZoneManagerRoutes = router;
