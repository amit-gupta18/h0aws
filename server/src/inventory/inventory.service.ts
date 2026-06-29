import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type {
  AdjustStockInput,
  ListInventoryTransactionsQuery,
} from "./inventory.schema.js";

type TxClient = Prisma.TransactionClient;

function insufficientStockError(productName: string, available: number, requested: number) {
  const err = new Error(
    `Insufficient stock for ${productName}. Available: ${available}, requested: ${requested}`
  ) as Error & { status: number };
  err.status = 400;
  return err;
}

function notFoundError(message: string) {
  const err = new Error(message) as Error & { status: number };
  err.status = 404;
  return err;
}

function mapTransaction(row: {
  id: string;
  type: string;
  quantityChange: unknown;
  notes: string | null;
  sourceId: string | null;
  createdAt: Date;
  product: { id: string; name: string; unit: string };
  performedBy: { id: string; email: string };
}) {
  return {
    id: row.id,
    type: row.type,
    quantityChange: Number(row.quantityChange),
    notes: row.notes,
    sourceId: row.sourceId,
    createdAt: row.createdAt.toISOString(),
    product: row.product,
    performedBy: row.performedBy,
  };
}

export const InventoryService = {
  async recordOpeningStock(
    tx: TxClient,
    params: {
      businessId: string;
      productId: string;
      quantity: number;
      performedById: string;
      notes?: string;
    }
  ) {
    if (params.quantity <= 0) return;

    await tx.inventoryTransaction.create({
      data: {
        productId: params.productId,
        businessId: params.businessId,
        quantityChange: params.quantity,
        type: "OPENING_STOCK",
        performedById: params.performedById,
        notes: params.notes ?? "Opening stock",
      },
    });
  },

  async deductForSale(
    tx: TxClient,
    params: {
      businessId: string;
      productId: string;
      quantity: number;
      sourceId: string;
      performedById: string;
    }
  ) {
    const product = await tx.product.findFirst({
      where: {
        id: params.productId,
        businessId: params.businessId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, name: true, quantity: true },
    });

    if (!product) {
      const err = new Error("Product not found") as Error & { status: number };
      err.status = 400;
      throw err;
    }

    const available = Number(product.quantity);
    const updated = await tx.product.updateMany({
      where: {
        id: params.productId,
        businessId: params.businessId,
        quantity: { gte: params.quantity },
      },
      data: { quantity: { decrement: params.quantity } },
    });

    if (updated.count === 0) {
      throw insufficientStockError(product.name, available, params.quantity);
    }

    await tx.inventoryTransaction.create({
      data: {
        productId: params.productId,
        businessId: params.businessId,
        quantityChange: -params.quantity,
        type: "SALE",
        sourceId: params.sourceId,
        performedById: params.performedById,
      },
    });
  },

  async restoreForCancel(
    tx: TxClient,
    params: {
      businessId: string;
      productId: string;
      quantity: number;
      sourceId: string;
      performedById: string;
      notes: string;
    }
  ) {
    await tx.product.update({
      where: { id: params.productId },
      data: { quantity: { increment: params.quantity } },
    });

    await tx.inventoryTransaction.create({
      data: {
        productId: params.productId,
        businessId: params.businessId,
        quantityChange: params.quantity,
        type: "MANUAL_ADJUSTMENT",
        sourceId: params.sourceId,
        performedById: params.performedById,
        notes: params.notes,
      },
    });
  },

  async manualAdjust(
    businessId: string,
    userId: string,
    input: AdjustStockInput
  ) {
    const { productId, quantityChange, notes } = input;

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: {
          id: productId,
          businessId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true, name: true, unit: true, quantity: true },
      });

      if (!product) {
        throw notFoundError("Product not found");
      }

      const available = Number(product.quantity);

      if (quantityChange < 0) {
        const decrease = Math.abs(quantityChange);
        const updated = await tx.product.updateMany({
          where: {
            id: productId,
            businessId,
            quantity: { gte: decrease },
          },
          data: { quantity: { decrement: decrease } },
        });

        if (updated.count === 0) {
          throw insufficientStockError(product.name, available, decrease);
        }
      } else {
        await tx.product.update({
          where: { id: productId },
          data: { quantity: { increment: quantityChange } },
        });
      }

      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId,
          businessId,
          quantityChange,
          type: "MANUAL_ADJUSTMENT",
          performedById: userId,
          notes,
        },
        include: {
          product: { select: { id: true, name: true, unit: true } },
          performedBy: { select: { id: true, email: true } },
        },
      });

      const updatedProduct = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { quantity: true },
      });

      return {
        product: {
          id: product.id,
          name: product.name,
          unit: product.unit,
          quantity: Number(updatedProduct.quantity),
        },
        transaction: mapTransaction(transaction),
      };
    });
  },

  async listTransactions(businessId: string, query: ListInventoryTransactionsQuery) {
    const { page, limit, productId, type, from, to } = query;
    const skip = (page - 1) * limit;

    const createdAt =
      from || to
        ? {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          }
        : undefined;

    const where = {
      businessId,
      ...(productId ? { productId } : {}),
      ...(type ? { type } : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, name: true, unit: true } },
          performedBy: { select: { id: true, email: true } },
        },
      }),
      prisma.inventoryTransaction.count({ where }),
    ]);

    return {
      data: rows.map(mapTransaction),
      total,
      page,
      limit,
    };
  },
};
