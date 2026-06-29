import type { Request, Response } from "express";
import { InsightsService } from "./insights.service.js";
import { InsightsSummaryQuerySchema } from "./insights.schema.js";
import { handleError } from "../common/errors.js";

export const InsightsController = {
  async summary(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;

    const parsed = InsightsSummaryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const result = await InsightsService.summary(businessId, parsed.data);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },
};
