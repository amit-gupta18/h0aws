import { prisma } from "../lib/prisma.js";
import type { CreateCustomerInput, ListCustomersQuery } from "./customer.schema.js";

export const CustomerService = {
  async search(businessId: string, query: ListCustomersQuery) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          businessId,
          deletedAt: null,
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : { businessId, deletedAt: null };

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          phone: true,
          gstin: true,
          stateCode: true,
          billingAddress: true,
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return { data, total, page, limit };
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
