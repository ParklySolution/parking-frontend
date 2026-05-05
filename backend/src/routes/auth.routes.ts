import { Router } from "express";
import { forgotPasswordController, resetPasswordController } from "../controllers/auth.controller.js";
import { forgotPasswordController, resetPasswordController, acceptInviteController } from "../controllers/auth.controller.js";

const router = Router();

router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);
router.post("/accept-invite", acceptInviteController);

export default router;