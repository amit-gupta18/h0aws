import type { Request, Response } from "express";
import { ProductService } from "./product.service.js";
import { CreateProductSchema } from "./product.schema.js";
import { handleError } from "../common/errors.js";

export const ProductController = {
  async list(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const search = typeof req.query["search"] === "string" ? req.query["search"] : undefined;

    try {
      const products = await ProductService.search(businessId, search);
      res.json({
        data: products.map((p) => ({
          ...p,
          sellingPrice: Number(p.sellingPrice),
          gstRate: Number(p.gstRate),
          quantity: Number(p.quantity),
        })),
      });
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
      res.status(201).json({
        ...product,
        sellingPrice: Number(product.sellingPrice),
        gstRate: Number(product.gstRate),
        quantity: Number(product.quantity),
      });
    } catch (err) {
      handleError(err, res);
    }
  },
};
