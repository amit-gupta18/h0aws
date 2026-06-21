import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import {
  SignupSchema,
  LoginSchema,
  ForgotPasswordSchema,
  VerifyOtpSchema,
  ResetPasswordSchema,
} from "./auth.schema.js";

import { handleError } from "../common/errors.js";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const AuthController = {
  async signup(req: Request, res: Response): Promise<void> {
    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const { email, password, phone } = parsed.data;
      const result = await AuthService.signup(email, password, phone ?? null, req.headers["user-agent"]);
      res.cookie("refreshToken", result.refreshToken, COOKIE_OPTS);
      res.status(201).json({ accessToken: result.accessToken, user: result.user, memberships: result.memberships });
    } catch (err) {
      handleError(err, res);
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const { email, password } = parsed.data;
      const result = await AuthService.login(email, password, req.headers["user-agent"]);
      res.cookie("refreshToken", result.refreshToken, COOKIE_OPTS);
      res.json({ accessToken: result.accessToken, user: result.user, memberships: result.memberships });
    } catch (err) {
      handleError(err, res);
    }
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const raw: string | undefined = req.cookies["refreshToken"];
    if (!raw) {
      res.status(401).json({ error: "No refresh token" });
      return;
    }
    try {
      const result = await AuthService.refresh(raw, req.headers["user-agent"]);
      res.cookie("refreshToken", result.refreshToken, COOKIE_OPTS);
      res.json({ accessToken: result.accessToken, user: result.user, memberships: result.memberships });
    } catch (err) {
      handleError(err, res);
    }
  },

  async logout(req: Request, res: Response): Promise<void> {
    const raw: string | undefined = req.cookies["refreshToken"];
    if (raw) await AuthService.logout(raw);
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out" });
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    const parsed = ForgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      await AuthService.forgotPassword(parsed.data.phone);
      res.json({ message: "If that phone is registered, an OTP has been sent" });
    } catch (err) {
      handleError(err, res);
    }
  },

  async verifyOtp(req: Request, res: Response): Promise<void> {
    const parsed = VerifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const resetToken = await AuthService.verifyOtp(parsed.data.phone, parsed.data.otp);
      res.json({ resetToken });
    } catch (err) {
      handleError(err, res);
    }
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    const parsed = ResetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      await AuthService.resetPassword(parsed.data.resetToken, parsed.data.newPassword);
      res.json({ message: "Password updated" });
    } catch (err) {
      handleError(err, res);
    }
  },
};
