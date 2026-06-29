import type { Request, Response } from "express";
import { InvoiceService } from "./invoice.service.js";
import {
  CreateInvoiceSchema,
  ListInvoicesQuerySchema,
  UpdateInvoiceSchema,
} from "./invoice.schema.js";
import { handleError } from "../common/errors.js";

export const InvoiceController = {
  async create(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const businessId = req.context!.businessId;

    const parsed = CreateInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const invoice = await InvoiceService.create(businessId, userId, parsed.data);
      res.status(201).json(invoice);
    } catch (err) {
      handleError(err, res);
    }
  },

  async list(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;

    const parsed = ListInvoicesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const result = await InvoiceService.list(businessId, parsed.data);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const invoiceId = req.params["id"] as string;

    try {
      const invoice = await InvoiceService.getById(businessId, invoiceId);
      res.json(invoice);
    } catch (err) {
      handleError(err, res);
    }
  },

  async getPdf(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const invoiceId = req.params["id"] as string;

    try {
      const result = await InvoiceService.generatePdf(businessId, invoiceId);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const businessId = req.context!.businessId;
    const invoiceId = req.params["id"] as string;

    const parsed = UpdateInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const invoice = await InvoiceService.update(businessId, invoiceId, userId, parsed.data);
      res.json(invoice);
    } catch (err) {
      handleError(err, res);
    }
  },

  async cancel(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const businessId = req.context!.businessId;
    const invoiceId = req.params["id"] as string;

    try {
      const result = await InvoiceService.cancel(businessId, invoiceId, userId);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },
};
