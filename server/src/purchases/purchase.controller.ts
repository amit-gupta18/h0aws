import type { Request, Response } from "express";
import { PurchaseService } from "./purchase.service.js";
import {
  CreatePurchaseSchema,
  UpdatePurchaseSchema,
  ListPurchasesQuerySchema,
} from "./purchase.schema.js";
import { handleError } from "../common/errors.js";

export const PurchaseController = {
  async list(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;

    const parsed = ListPurchasesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const result = await PurchaseService.list(businessId, parsed.data);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const userId = req.user!.userId;

    const parsed = CreatePurchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const bill = await PurchaseService.create(businessId, userId, parsed.data);
      res.status(201).json(bill);
    } catch (err) {
      handleError(err, res);
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const purchaseId = req.params["id"] as string;

    const parsed = UpdatePurchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const bill = await PurchaseService.update(businessId, purchaseId, parsed.data);
      res.json(bill);
    } catch (err) {
      handleError(err, res);
    }
  },

  async delete(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const purchaseId = req.params["id"] as string;

    try {
      const result = await PurchaseService.delete(businessId, purchaseId);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },
};
