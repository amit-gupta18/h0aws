import type { Request, Response } from "express";
import { GstService } from "./gst.service.js";
import { GstExportQuerySchema, GstPeriodQuerySchema } from "./gst.schema.js";
import { FyQuerySchema } from "./gst-intelligence.schema.js";
import { GstAdvisoryService } from "./gst-advisory.service.js";
import { GstOcrService } from "./gst-ocr.service.js";
import { GstReconciliationDemo } from "./gst-reconciliation.demo.js";
import { GstItrService } from "./gst-itr.service.js";
import { handleError } from "../common/errors.js";

export const GstController = {
  async summary(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;

    const parsed = GstPeriodQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const result = await GstService.summary(businessId, parsed.data);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },

  async exportCsv(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;

    const parsed = GstExportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const { csv, filename } = await GstService.exportCsv(businessId, parsed.data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      handleError(err, res);
    }
  },

  async compositionAdvisory(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const parsed = FyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const result = await GstAdvisoryService.composition(
        businessId,
        parsed.data.fyStartYear
      );
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },

  async purchaseOcr(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const userId = req.user!.userId;

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Image file required (field: image)" });
      return;
    }

    const autoSave = req.query["save"] === "true";

    try {
      const result = await GstOcrService.processImage(
        businessId,
        userId,
        file.buffer,
        file.mimetype,
        autoSave
      );
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },

  async reconciliationDemo(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const parsed = GstPeriodQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const result = await GstReconciliationDemo.getDemo(
        businessId,
        parsed.data.month,
        parsed.data.year
      );
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },

  async itrPackage(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const parsed = FyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const result = await GstItrService.generatePdf(
        businessId,
        parsed.data.fyStartYear
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`
      );
      res.send(result.buffer);
    } catch (err) {
      handleError(err, res);
    }
  },
};
