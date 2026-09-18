import { Router } from "express";
import { auth } from "../../middleware/checkAuth.js";
import { Role } from "../../../generated/prisma/enums.js";
import { SubStationManagerController } from "./subStationManager.controller.js";

const router = Router();

router.post(
    "/allocate-kw",
    auth(Role.SUBSTATION_MANAGER),
    SubStationManagerController.allocateSubStationKw,
);

router.post(
    "/generate-schedule",
    auth(Role.SUBSTATION_MANAGER),
    SubStationManagerController.generateLoadSheddingSchedule,
);

router.get(
    "/get-schedule-batches",
    auth(Role.SUBSTATION_MANAGER),
    SubStationManagerController.getScheduleBatches,
);

router.get(
    "/get-schedule-batches/:scheduleBatchId",
    auth(Role.SUBSTATION_MANAGER, Role.ZONE_MANAGER),
    SubStationManagerController.getScheduleBatcheById,
);

router.post(
    "/get-schedule-batches/:scheduleBatchId",
    auth(Role.SUBSTATION_MANAGER),
    SubStationManagerController.publishScheduleBatch,
);

router.delete(
    "/get-schedule-batches/:scheduleBatchId",
    auth(Role.SUBSTATION_MANAGER),
    SubStationManagerController.deleteScheduleBatch,
);

router.get(
    "/zone/get-schedule-batches",
    auth(Role.ZONE_MANAGER),
    SubStationManagerController.getAllScheduleBatches,
);

router.get(
    "/get-outage-reports",
    auth(Role.SUBSTATION_MANAGER),
    SubStationManagerController.getOutageReports,
);

router.get(
    "/get-outage-reports/:outageReportId",
    auth(Role.SUBSTATION_MANAGER),
    SubStationManagerController.getOutageReportById,
);

router.get(
    "/get-all-technicians",
    auth(Role.SUBSTATION_MANAGER),
    SubStationManagerController.getAllTechnicians,
);

router.post(
    "/get-outage-reports/:outageReportId",
    auth(Role.SUBSTATION_MANAGER),
    SubStationManagerController.assignTechnicianToOutageReport,
);

export const SubStationManagerRoute = router;
