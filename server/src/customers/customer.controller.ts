import type { Request, Response } from "express";
import { CustomerService } from "./customer.service.js";
import { CreateCustomerSchema } from "./customer.schema.js";
import { handleError } from "../common/errors.js";

export const CustomerController = {
  async list(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const search = typeof req.query["search"] === "string" ? req.query["search"] : undefined;

    try {
      const customers = await CustomerService.search(businessId, search);
      res.json({ data: customers });
    } catch (err) {
      handleError(err, res);
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;

    const parsed = CreateCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const customer = await CustomerService.create(businessId, parsed.data);
      res.status(201).json(customer);
    } catch (err) {
      handleError(err, res);
    }
  },
};
