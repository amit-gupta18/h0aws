import type { Request, Response } from "express";
import { CustomerService } from "./customer.service.js";
import { CreateCustomerSchema, ListCustomersQuerySchema } from "./customer.schema.js";
import { handleError } from "../common/errors.js";

export const CustomerController = {
  async list(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;

    const parsed = ListCustomersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const result = await CustomerService.search(businessId, parsed.data);
      res.json(result);
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
