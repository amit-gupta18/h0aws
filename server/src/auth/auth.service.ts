import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { sendPasswordResetOtp } from "../lib/email.js";
import type { MemberRole } from "@prisma/client";

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = "1h";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const OTP_TTL_SEC = 600;
const RESET_TTL_SEC = 600;

/**
 * Access token proves identity only. Which business the user is acting in and
 * their role there are resolved per-request from BusinessMember — never baked
 * into the token (keeps role/revocation changes instant).
 */
export interface AuthPayload {
  userId: string;
  email: string;
}

export interface Membership {
  businessId: string;
  tradeName: string;
  role: MemberRole;
  gstin: string | null;
  stateCode: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string; // raw — caller sets this in cookie
  user: { id: string; email: string };
  memberships: Membership[];
}

function generateToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, process.env["JWT_SECRET"]!, { expiresIn: ACCESS_TOKEN_TTL });
}

async function getMemberships(userId: string): Promise<Membership[]> {
  const rows = await prisma.businessMember.findMany({
    where: { userId },
    select: {
      businessId: true,
      role: true,
      business: { select: { tradeName: true, gstin: true, stateCode: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    businessId: r.businessId,
    tradeName: r.business.tradeName,
    role: r.role,
    gstin: r.business.gstin,
    stateCode: r.business.stateCode,
  }));
}

async function persistRefreshToken(userId: string, deviceInfo?: string): Promise<string> {
  const raw = generateToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      token: hashToken(raw),
      deviceInfo: deviceInfo ?? null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return raw;
}

export const AuthService = {
  /**
   * Identity only — creates a User and nothing else. A freshly signed-up user
   * has zero memberships; the client routes them to business onboarding, which
   * calls BusinessService.createWithOwner to make them an OWNER.
   */
  async signup(email: string, password: string, phone: string | null, deviceInfo?: string): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw Object.assign(new Error("Email already in use"), { status: 409 });

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, phone, passwordHash },
      select: { id: true, email: true },
    });

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = await persistRefreshToken(user.id, deviceInfo);

    return { accessToken, refreshToken, user, memberships: [] };
  },

  async login(email: string, password: string, deviceInfo?: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt || !user.isActive) {
      throw Object.assign(new Error("Invalid credentials"), { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw Object.assign(new Error("Invalid credentials"), { status: 401 });

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = await persistRefreshToken(user.id, deviceInfo);
    const memberships = await getMemberships(user.id);

    return { accessToken, refreshToken, user: { id: user.id, email: user.email }, memberships };
  },

  async refresh(rawToken: string, deviceInfo?: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string };
    memberships: Membership[];
  }> {
    const hashed = hashToken(rawToken);
    const stored = await prisma.refreshToken.findUnique({ where: { token: hashed } });

    if (!stored || stored.expiresAt < new Date()) {
      throw Object.assign(new Error("Invalid or expired refresh token"), { status: 401 });
    }

    await prisma.refreshToken.delete({ where: { token: hashed } });

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: stored.userId },
      select: { id: true, email: true },
    });

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = await persistRefreshToken(user.id, deviceInfo);
    const memberships = await getMemberships(user.id);

    return { accessToken, refreshToken, user, memberships };
  },

  async logout(rawToken: string): Promise<void> {
    const hashed = hashToken(rawToken);
    await prisma.refreshToken.deleteMany({ where: { token: hashed } });
  },

  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return;

    const otp = generateOtp();
    await redis.setex(`otp:${normalizedEmail}`, OTP_TTL_SEC, otp);
    await sendPasswordResetOtp(normalizedEmail, otp);
  },

  async verifyOtp(email: string, otp: string): Promise<string> {
    const normalizedEmail = email.toLowerCase();
    const stored = await redis.get(`otp:${normalizedEmail}`);
    if (!stored || stored !== otp) {
      throw Object.assign(new Error("Invalid or expired OTP"), { status: 400 });
    }

    await redis.del(`otp:${normalizedEmail}`);

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) throw Object.assign(new Error("Invalid or expired OTP"), { status: 400 });

    const resetToken = generateToken();
    await redis.setex(`reset:${resetToken}`, RESET_TTL_SEC, user.id);
    return resetToken;
  },

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    const userId = await redis.get(`reset:${resetToken}`);
    if (!userId) throw Object.assign(new Error("Invalid or expired reset token"), { status: 400 });

    await redis.del(`reset:${resetToken}`);

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
  },
};
