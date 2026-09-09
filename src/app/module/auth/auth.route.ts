import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { CustomerValidation } from "./auth.validation.js";
import { auth } from "../../middleware/checkAuth.js";
import { Role } from "../../../generated/prisma/enums.js";

const router = Router();

router.post(
    "/register",
    validateRequest(CustomerValidation.CustomerRegistrationZSchema),
    AuthController.registerCustomer,
);

router.post(
    "/email-verify",
    validateRequest(CustomerValidation.CustomerEmailVerifyZSchema),
    AuthController.emailVerification,
);

router.post(
    "/login",
    validateRequest(CustomerValidation.UserLoginZSchema),
    AuthController.loginUser,
);

router.post("/refresh-token", AuthController.refreshToken);

router.get(
    "/get-me",
    auth(
        Role.CUSTOMER,
        Role.TECHNICIAN,
        Role.SUBSTATION_MANAGER,
        Role.ZONE_MANAGER,
    ),
    AuthController.getMe,
);

export const AuthRoute = router;
