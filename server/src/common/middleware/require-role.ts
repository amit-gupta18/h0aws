import type { Request, Response, NextFunction } from "express";
import type { MemberRole } from "@prisma/client";

/**
 * RBAC guard factory. Must run after `businessContext` (which populates the role).
 *
 *   router.delete("/products/:id", businessContext, requireRole("OWNER"), handler)
 */
export function requireRole(...allowed: MemberRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.context?.role;
    if (!role || !allowed.includes(role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
