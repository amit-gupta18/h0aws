import type { Request, Response } from "express";
import { ProductService } from "./product.service.js";
import { CreateProductSchema, ListProductsQuerySchema } from "./product.schema.js";
import { handleError } from "../common/errors.js";

export const ProductController = {
  async list(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;

    const parsed = ListProductsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const result = await ProductService.search(businessId, parsed.data);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;

    const parsed = CreateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const product = await ProductService.create(businessId, parsed.data);
      res.status(201).json(product);
    } catch (err) {
      handleError(err, res);
    }
  },
};
