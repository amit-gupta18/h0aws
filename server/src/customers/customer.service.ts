import { prisma } from "../lib/prisma.js";
import type { CreateCustomerInput } from "./customer.schema.js";

export const CustomerService = {
  async search(businessId: string, query?: string) {
    const where = query
      ? {
          businessId,
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : { businessId, deletedAt: null };

    return prisma.customer.findMany({
      where,
      take: 20,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        gstin: true,
        stateCode: true,
        billingAddress: true,
      },
    });
  },

  async create(businessId: string, input: CreateCustomerInput) {
    return prisma.customer.create({
      data: {
        businessId,
        name: input.name,
        phone: input.phone ?? null,
        gstin: input.gstin ?? null,
        stateCode: input.stateCode ?? null,
        billingAddress: input.billingAddress ?? null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        gstin: true,
        stateCode: true,
        billingAddress: true,
      },
    });
  },
};
