import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../common/middleware/authenticate.js";
import { AuthController } from "./auth.controller.js";

const router = Router();

const forgotPasswordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
const verifyOtpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.post("/signup", AuthController.signup);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", authenticate, AuthController.logout);
router.post("/forgot-password", forgotPasswordLimiter, AuthController.forgotPassword);
router.post("/verify-otp", verifyOtpLimiter, AuthController.verifyOtp);
router.post("/reset-password", AuthController.resetPassword);

export { router as authRouter };
