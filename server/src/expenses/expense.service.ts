import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type { CreateExpenseInput, ListExpensesQuery, UpdateExpenseInput } from "./expense.schema.js";

function mapExpense(expense: {
  id: string;
  category: string;
  amount: unknown;
  description: string | null;
  expenseDate: Date;
  createdAt: Date;
}) {
  return {
    id: expense.id,
    category: expense.category,
    amount: Number(expense.amount),
    description: expense.description,
    expenseDate: expense.expenseDate.toISOString().slice(0, 10),
    createdAt: expense.createdAt.toISOString(),
  };
}

function buildWhere(businessId: string, query: ListExpensesQuery): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = { businessId };

  if (query.search) {
    where.OR = [
      { category: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.from || query.to) {
    where.expenseDate = {};
    if (query.from) where.expenseDate.gte = new Date(query.from);
    if (query.to) where.expenseDate.lte = new Date(query.to);
  }

  return where;
}

export const ExpenseService = {
  async list(businessId: string, query: ListExpensesQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const where = buildWhere(businessId, query);

    const [rows, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      }),
      prisma.expense.count({ where }),
    ]);

    return {
      data: rows.map(mapExpense),
      total,
      page,
      limit,
    };
  },

  async create(businessId: string, userId: string, input: CreateExpenseInput) {
    const expense = await prisma.expense.create({
      data: {
        businessId,
        createdById: userId,
        category: input.category,
        amount: input.amount,
        expenseDate: new Date(input.expenseDate),
        description: input.description ?? null,
      },
    });

    return mapExpense(expense);
  },

  async update(businessId: string, expenseId: string, input: UpdateExpenseInput) {
    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, businessId },
    });

    if (!existing) {
      const err = new Error("Expense not found") as Error & { status: number };
      err.status = 404;
      throw err;
    }

    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        category: input.category,
        amount: input.amount,
        expenseDate: new Date(input.expenseDate),
        description: input.description ?? null,
      },
    });

    return mapExpense(expense);
  },

  async delete(businessId: string, expenseId: string) {
    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, businessId },
    });

    if (!existing) {
      const err = new Error("Expense not found") as Error & { status: number };
      err.status = 404;
      throw err;
    }

    await prisma.expense.delete({ where: { id: expenseId } });
    return { id: expenseId };
  },
};
