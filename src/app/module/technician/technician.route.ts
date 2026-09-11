import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { auth } from "../../middleware/checkAuth.js";
import { Role } from "../../../generated/prisma/enums.js";
import { TechnicianValidation } from "./technician.validation.js";
import { TechnicianController } from "./technician.controller.js";

const router = Router();

router.post(
    "/apply-as-technician",
    // validateRequest(TechnicianValidation.ApplyAsTechnicianZSchema),
    TechnicianController.registerTechnician,
);

export const TechnicianRoute = router;
