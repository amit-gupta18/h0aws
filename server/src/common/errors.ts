import type { Response } from "express";

/** Translates a thrown Error (optionally carrying a `status`) into a JSON response. */
export function handleError(err: unknown, res: Response): void {
  const e = err as Error & { status?: number };
  res.status(e.status ?? 500).json({ error: e.message ?? "Internal server error" });
}
