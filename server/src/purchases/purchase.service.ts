import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type {
  CreatePurchaseInput,
  ListPurchasesQuery,
  UpdatePurchaseInput,
} from "./purchase.schema.js";

function mapPurchase(row: {
  id: string;
  supplierName: string;
  supplierGstin: string | null;
  supplierStateCode: string | null;
  billNumber: string;
  billDate: Date;
  transactionType: string;
  taxableAmount: unknown;
  cgstTotal: unknown;
  sgstTotal: unknown;
  igstTotal: unknown;
  grandTotal: unknown;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    supplierName: row.supplierName,
    supplierGstin: row.supplierGstin,
    supplierStateCode: row.supplierStateCode,
    billNumber: row.billNumber,
    billDate: row.billDate.toISOString().slice(0, 10),
    transactionType: row.transactionType,
    taxableAmount: Number(row.taxableAmount),
    cgstTotal: Number(row.cgstTotal),
    sgstTotal: Number(row.sgstTotal),
    igstTotal: Number(row.igstTotal),
    grandTotal: Number(row.grandTotal),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

function buildWhere(businessId: string, query: ListPurchasesQuery): Prisma.PurchaseBillWhereInput {
  const where: Prisma.PurchaseBillWhereInput = { businessId };

  if (query.search) {
    where.OR = [
      { supplierName: { contains: query.search, mode: "insensitive" } },
      { billNumber: { contains: query.search, mode: "insensitive" } },
      { supplierGstin: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.from || query.to) {
    where.billDate = {};
    if (query.from) where.billDate.gte = new Date(query.from);
    if (query.to) where.billDate.lte = new Date(query.to);
  }

  return where;
}

export const PurchaseService = {
  async list(businessId: string, query: ListPurchasesQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const where = buildWhere(businessId, query);

    const [rows, total] = await Promise.all([
      prisma.purchaseBill.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ billDate: "desc" }, { createdAt: "desc" }],
      }),
      prisma.purchaseBill.count({ where }),
    ]);

    return { data: rows.map(mapPurchase), total, page, limit };
  },

  async create(businessId: string, userId: string, input: CreatePurchaseInput) {
    const bill = await prisma.purchaseBill.create({
      data: {
        businessId,
        createdById: userId,
        supplierName: input.supplierName,
        supplierGstin: input.supplierGstin ?? null,
        supplierStateCode: input.supplierStateCode ?? null,
        billNumber: input.billNumber,
        billDate: new Date(input.billDate),
        transactionType: input.transactionType,
        taxableAmount: input.taxableAmount,
        cgstTotal: input.cgstTotal,
        sgstTotal: input.sgstTotal,
        igstTotal: input.igstTotal,
        grandTotal: input.grandTotal,
        notes: input.notes ?? null,
      },
    });

    return mapPurchase(bill);
  },

  async update(businessId: string, purchaseId: string, input: UpdatePurchaseInput) {
    const existing = await prisma.purchaseBill.findFirst({
      where: { id: purchaseId, businessId },
    });

    if (!existing) {
      const err = new Error("Purchase bill not found") as Error & { status: number };
      err.status = 404;
      throw err;
    }

    const bill = await prisma.purchaseBill.update({
      where: { id: purchaseId },
      data: {
        supplierName: input.supplierName,
        supplierGstin: input.supplierGstin ?? null,
        supplierStateCode: input.supplierStateCode ?? null,
        billNumber: input.billNumber,
        billDate: new Date(input.billDate),
        transactionType: input.transactionType,
        taxableAmount: input.taxableAmount,
        cgstTotal: input.cgstTotal,
        sgstTotal: input.sgstTotal,
        igstTotal: input.igstTotal,
        grandTotal: input.grandTotal,
        notes: input.notes ?? null,
      },
    });

    return mapPurchase(bill);
  },

  async delete(businessId: string, purchaseId: string) {
    const existing = await prisma.purchaseBill.findFirst({
      where: { id: purchaseId, businessId },
    });

    if (!existing) {
      const err = new Error("Purchase bill not found") as Error & { status: number };
      err.status = 404;
      throw err;
    }

    await prisma.purchaseBill.delete({ where: { id: purchaseId } });
    return { id: purchaseId };
  },
};
