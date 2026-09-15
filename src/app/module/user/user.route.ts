import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { auth } from "../../middleware/checkAuth.js";
import { Role } from "../../../generated/prisma/enums.js";
import { UserController } from "./user.controller.js";
import { rechargeTokenZValidationSchema } from "./user.validation.js";

const router = Router();

router.post("/request-token", auth(Role.CUSTOMER), UserController.requestToken);

router.get(
    "/request-token/payment/callback",
    UserController.requestTokenCallBack,
);

router.post(
    "/recharge-token",
    validateRequest(rechargeTokenZValidationSchema),
    auth(Role.CUSTOMER),
    UserController.rechargeToken,
);

export const UserRoutes = router;
