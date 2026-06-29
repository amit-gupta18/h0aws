import type { Request, Response } from "express";
import { InventoryService } from "./inventory.service.js";
import {
  AdjustStockSchema,
  ListInventoryTransactionsQuerySchema,
} from "./inventory.schema.js";
import { handleError } from "../common/errors.js";

export const InventoryController = {
  async listTransactions(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;

    const parsed = ListInventoryTransactionsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const result = await InventoryService.listTransactions(businessId, parsed.data);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },

  async adjust(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const userId = req.user!.userId;

    const parsed = AdjustStockSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const result = await InventoryService.manualAdjust(businessId, userId, parsed.data);
      res.status(201).json(result);
    } catch (err) {
      handleError(err, res);
    }
  },
};
