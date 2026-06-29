import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

function insufficientStockError(productName: string, available: number, requested: number) {
  const err = new Error(
    `Insufficient stock for ${productName}. Available: ${available}, requested: ${requested}`
  ) as Error & { status: number };
  err.status = 400;
  return err;
}

export const InventoryService = {
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
};
