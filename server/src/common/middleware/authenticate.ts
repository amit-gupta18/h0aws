import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/** The access token proves identity only — no business/role is encoded. */
export interface AuthPayload {
  userId: string;
  email: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env["JWT_SECRET"]!) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
