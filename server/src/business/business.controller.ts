import type { Request, Response } from "express";
import { BusinessService } from "./business.service.js";
import { CreateBusinessSchema, UpdateBusinessSchema } from "./business.schema.js";
import { handleError } from "../common/errors.js";

export const BusinessController = {
  // POST /api/v1/businesses — authenticated user creates a business, becomes OWNER
  async create(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const parsed = CreateBusinessSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const result = await BusinessService.createWithOwner(userId, parsed.data);
      res.status(201).json({ business: result.business, membership: result.membership });
    } catch (err) {
      handleError(err, res);
    }
  },

  // GET /api/v1/businesses — list the businesses this user belongs to
  async list(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    try {
      const memberships = await BusinessService.listForUser(userId);
      res.json({ memberships });
    } catch (err) {
      handleError(err, res);
    }
  },

  // GET /api/v1/businesses/:id — get full business details
  async getById(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const businessId = req.params.id;
    try {
      const business = await BusinessService.getById(businessId, userId);
      res.json(business);
    } catch (err) {
      handleError(err, res);
    }
  },

  // PUT /api/v1/businesses/:id — update business details (OWNER only)
  async update(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const businessId = req.params.id;
    const parsed = UpdateBusinessSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const business = await BusinessService.update(businessId, userId, parsed.data);
      res.json(business);
    } catch (err) {
      handleError(err, res);
    }
  },
};
