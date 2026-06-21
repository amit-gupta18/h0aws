import type { Request, Response, NextFunction } from "express";
import type { MemberRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export interface BusinessContext {
  businessId: string;
  role: MemberRole;
}

/**
 * Resolves the active business for this request from the `X-Business-Id` header
 * and verifies the authenticated user is a member of it. Role is read fresh from
 * the DB on every request, so role changes / removals take effect immediately.
 *
 * Must run after `authenticate`.
 */
export async function businessContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const businessId = req.headers["x-business-id"];
  if (typeof businessId !== "string" || !businessId) {
    res.status(400).json({ error: "Missing X-Business-Id header" });
    return;
  }

  const membership = await prisma.businessMember.findUnique({
    where: { userId_businessId: { userId, businessId } },
    select: { role: true },
  });

  if (!membership) {
    res.status(403).json({ error: "You are not a member of this business" });
    return;
  }

  req.context = { businessId, role: membership.role };
  next();
}
