import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { CustomerValidation } from "./auth.validation.js";

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

export const AuthRoute = router;
