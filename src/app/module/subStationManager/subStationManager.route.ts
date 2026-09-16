import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { auth } from "../../middleware/checkAuth.js";
import { Role } from "../../../generated/prisma/enums.js";
import { upload } from "../../lib/multer.js";
import { CustomerValidation } from "../auth/auth.validation.js";
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

export const SubStationManagerRoute = router;
