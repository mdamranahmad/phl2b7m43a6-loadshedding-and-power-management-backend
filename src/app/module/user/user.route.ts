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

router.get("/get-my-tokens", auth(Role.CUSTOMER), UserController.getMyTokens);

router.post(
    "/get-my-tokens/:tokenId",
    auth(Role.CUSTOMER),
    UserController.payUnPaidToken,
);

export const UserRoutes = router;
