import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { auth } from "../../middleware/checkAuth.js";
import { Role } from "../../../generated/prisma/enums.js";
import { TechnicianController } from "./technician.controller.js";
import { upload } from "../../lib/multer.js";
import { CustomerValidation } from "../auth/auth.validation.js";

const router = Router();

router.post(
    "/apply-as-technician",
    upload.fields([{ name: "resume", maxCount: 1 }]),
    TechnicianController.registerTechnician,
);

router.post(
    "/email-verify",
    validateRequest(CustomerValidation.CustomerEmailVerifyZSchema),
    TechnicianController.emailVerification,
);
//  NOTE: If this api route placed below the /:technicianId api, it will throw 403 forbidden error
router.get(
    "/get-assignments",
    auth(Role.TECHNICIAN),
    TechnicianController.getAssignments,
);

router.patch(
    "/approve-technician",
    auth(Role.ZONE_MANAGER, Role.SUBSTATION_MANAGER),
    TechnicianController.approveTechnician,
);

router.get(
    "/get-pending-tech-application",
    auth(Role.ZONE_MANAGER, Role.SUBSTATION_MANAGER),
    TechnicianController.getPendingTechnicianApplications,
);

router.patch(
    "/get-assignments/:outageReportId",
    auth(Role.TECHNICIAN),
    TechnicianController.resolveAssignment,
);

router.get(
    "/:technicianId",
    auth(Role.ZONE_MANAGER, Role.SUBSTATION_MANAGER),
    TechnicianController.getTechnicianProfile,
);

export const TechnicianRoute = router;

/**
 * When Express receives a request for GET /get-assignments:

    Express starts checking routes from the top of your file.

    It reaches router.get("/:technicianId", ...) first.

    The dynamic segment /:technicianId acts as a wildcard catch-all for any single path segment following /.

    Express treats the literal string "get-assignments" as the value for req.params.technicianId.

    Because the :technicianId route was registered first, Express executes that handler's middleware chain (auth(Role.ZONE_MANAGER, Role.SUBSTATION_MANAGER)), completely bypassing the /get-assignments route defined below it.
 
    The Golden Rule of Express Routing

    Always place static routes before dynamic/parameterized routes:

    Static routes first: /get-assignments, /pending, /me

    Dynamic routes last: /:id, /:technicianId, /:slug
 
 */
