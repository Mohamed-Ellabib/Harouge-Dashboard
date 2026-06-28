import { Router } from "express";

import { requireAuthentication } from "../../middleware/authorization";
import { validateRequest } from "../../shared/validation/validate-request";

import {
  changePasswordController,
  getCsrfController,
  getMeController,
  loginController,
  logoutController
} from "./auth.controller";
import {
  changePasswordBodySchema,
  loginBodySchema
} from "./auth.validation";

export const authRouter = Router();

authRouter.get("/csrf", getCsrfController);

authRouter.post(
  "/login",
  validateRequest({ body: loginBodySchema }),
  loginController
);

authRouter.post("/logout", logoutController);

authRouter.get("/me", requireAuthentication, getMeController);

authRouter.post(
  "/change-password",
  requireAuthentication,
  validateRequest({ body: changePasswordBodySchema }),
  changePasswordController
);
