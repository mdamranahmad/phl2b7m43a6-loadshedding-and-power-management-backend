import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { auth } from "../../middleware/checkAuth.js";
import { Role } from "../../../generated/prisma/enums.js";
import { TechnicianController } from "./technician.controller.js";
import { upload } from "../../lib/multer.js";

const router = Router();

router.post(
    "/apply-as-technician",
    upload.fields([{ name: "resume", maxCount: 1 }]),
    TechnicianController.registerTechnician,
);

export const TechnicianRoute = router;
