import { prisma } from "../lib/prisma.js";
import type { CreateProductInput } from "./product.schema.js";

export const ProductService = {
  async search(businessId: string, query?: string) {
    const where = query
      ? {
          businessId,
          isActive: true,
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { sku: { contains: query, mode: "insensitive" as const } },
            { hsnCode: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : { businessId, isActive: true, deletedAt: null };

    return prisma.product.findMany({
      where,
      take: 20,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        hsnCode: true,
        unit: true,
        sellingPrice: true,
        gstRate: true,
      },
    });
  },

  async create(businessId: string, input: CreateProductInput) {
    return prisma.product.create({
      data: {
        businessId,
        name: input.name,
        sellingPrice: input.sellingPrice,
        gstRate: input.gstRate,
        unit: input.unit,
        hsnCode: input.hsnCode ?? null,
        category: input.category ?? null,
      },
      select: {
        id: true,
        name: true,
        hsnCode: true,
        unit: true,
        sellingPrice: true,
        gstRate: true,
      },
    });
  },
};
