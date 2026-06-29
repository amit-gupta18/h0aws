import type { Request, Response } from "express";
import { ExpenseService } from "./expense.service.js";
import {
  CreateExpenseSchema,
  UpdateExpenseSchema,
  ListExpensesQuerySchema,
} from "./expense.schema.js";
import { handleError } from "../common/errors.js";

export const ExpenseController = {
  async list(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;

    const parsed = ListExpensesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const result = await ExpenseService.list(businessId, parsed.data);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const userId = req.user!.userId;

    const parsed = CreateExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const expense = await ExpenseService.create(businessId, userId, parsed.data);
      res.status(201).json(expense);
    } catch (err) {
      handleError(err, res);
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const expenseId = req.params["id"] as string;

    const parsed = UpdateExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const expense = await ExpenseService.update(businessId, expenseId, parsed.data);
      res.json(expense);
    } catch (err) {
      handleError(err, res);
    }
  },

  async delete(req: Request, res: Response): Promise<void> {
    const businessId = req.context!.businessId;
    const expenseId = req.params["id"] as string;

    try {
      const result = await ExpenseService.delete(businessId, expenseId);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },
};
