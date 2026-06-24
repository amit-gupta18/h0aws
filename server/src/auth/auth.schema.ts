import { z } from "zod";

export const SignupSchema = z.object({
  email: z.email(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  password: z.string().min(8),
});

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
});

export const VerifyOtpSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
  otp: z.string().length(6),
});

export const ResetPasswordSchema = z.object({
  resetToken: z.string().min(1),
  newPassword: z.string().min(8),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
