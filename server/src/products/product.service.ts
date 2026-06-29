import { prisma } from "../lib/prisma.js";
import { InventoryService } from "../inventory/inventory.service.js";
import type { CreateProductInput, ListProductsQuery } from "./product.schema.js";

function mapProduct(p: {
  id: string;
  name: string;
  hsnCode: string | null;
  unit: string;
  sellingPrice: unknown;
  gstRate: unknown;
  quantity: unknown;
  location: string | null;
}) {
  return {
    id: p.id,
    name: p.name,
    hsnCode: p.hsnCode,
    unit: p.unit,
    sellingPrice: Number(p.sellingPrice),
    gstRate: Number(p.gstRate),
    quantity: Number(p.quantity),
    location: p.location,
  };
}

export const ProductService = {
  async search(businessId: string, query: ListProductsQuery) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          businessId,
          isActive: true,
          deletedAt: null,
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
            { hsnCode: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : { businessId, isActive: true, deletedAt: null };

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          hsnCode: true,
          unit: true,
          sellingPrice: true,
          gstRate: true,
          quantity: true,
          location: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: rows.map(mapProduct),
      total,
      page,
      limit,
    };
  },

  async create(businessId: string, userId: string, input: CreateProductInput) {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          businessId,
          name: input.name,
          sellingPrice: input.sellingPrice,
          gstRate: input.gstRate,
          unit: input.unit,
          hsnCode: input.hsnCode ?? null,
          category: input.category ?? null,
          quantity: input.quantity,
          location: input.location ?? null,
        },
        select: {
          id: true,
          name: true,
          hsnCode: true,
          unit: true,
          sellingPrice: true,
          gstRate: true,
          quantity: true,
          location: true,
        },
      });

      await InventoryService.recordOpeningStock(tx, {
        businessId,
        productId: created.id,
        quantity: input.quantity,
        performedById: userId,
      });

      return created;
    });

    return mapProduct(product);
  },
};
