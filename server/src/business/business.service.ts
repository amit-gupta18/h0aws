import { prisma } from "../lib/prisma.js";
import type { CreateBusinessInput, UpdateBusinessInput } from "./business.schema.js";

export const BusinessService = {
  /**
   * The single code path that mints an OWNER. Creates the tenant and all its
   * invariants atomically: Business + OWNER membership + default Location +
   * InvoiceSequence. Called by signup onboarding and "create another business".
   */
  async createWithOwner(userId: string, input: CreateBusinessInput) {
    return prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          tradeName: input.tradeName,
          legalName: input.legalName ?? null,
          gstin: input.gstin ?? null,
          gstinType: input.gstinType ?? "UNREGISTERED",
          address: input.address ?? null,
          stateCode: input.stateCode,
          phone: input.phone ?? null,
        },
      });

      const membership = await tx.businessMember.create({
        data: { userId, businessId: business.id, role: "OWNER" },
      });

      // Atomic invoice counter; prefix lives here (single source of truth).
      await tx.invoiceSequence.create({
        data: { businessId: business.id, prefix: input.invoicePrefix, currentVal: 0 },
      });

      return {
        business,
        membership: {
          businessId: business.id,
          tradeName: business.tradeName,
          role: membership.role,
          gstin: business.gstin,
          stateCode: business.stateCode,
        },
      };
    });
  },

  /** Memberships for the business switcher / onboarding decision on the client. */
  async listForUser(userId: string) {
    const rows = await prisma.businessMember.findMany({
      where: { userId },
      select: {
        businessId: true,
        role: true,
        business: { select: { tradeName: true, gstin: true, stateCode: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      businessId: r.businessId,
      tradeName: r.business.tradeName,
      role: r.role,
      gstin: r.business.gstin,
      stateCode: r.business.stateCode,
    }));
  },

  /** Get full business details. Only accessible by members. */
  async getById(businessId: string, userId: string) {
    const membership = await prisma.businessMember.findFirst({
      where: { businessId, userId },
    });
    if (!membership) {
      const err = new Error("Business not found") as Error & { status: number };
      err.status = 404;
      throw err;
    }

    const business = await prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: {
        id: true,
        tradeName: true,
        legalName: true,
        gstin: true,
        gstinType: true,
        address: true,
        stateCode: true,
        phone: true,
        logoUrl: true,
        inventoryTracking: true,
        createdAt: true,
      },
    });

    const sequence = await prisma.invoiceSequence.findUnique({
      where: { businessId },
      select: { prefix: true },
    });

    return {
      ...business,
      invoicePrefix: sequence?.prefix ?? "",
      role: membership.role,
    };
  },

  /** Update business details. Only OWNER can update. */
  async update(businessId: string, userId: string, input: UpdateBusinessInput) {
    const membership = await prisma.businessMember.findFirst({
      where: { businessId, userId },
    });
    if (!membership) {
      const err = new Error("Business not found") as Error & { status: number };
      err.status = 404;
      throw err;
    }
    if (membership.role !== "OWNER") {
      const err = new Error("Only owners can update business settings") as Error & { status: number };
      err.status = 403;
      throw err;
    }

    const { invoicePrefix, ...rest } = input;

    // Filter out undefined values to satisfy Prisma's exactOptionalPropertyTypes
    const businessData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        businessData[key] = value;
      }
    }

    const business = await prisma.business.update({
      where: { id: businessId },
      data: businessData,
      select: {
        id: true,
        tradeName: true,
        legalName: true,
        gstin: true,
        gstinType: true,
        address: true,
        stateCode: true,
        phone: true,
        logoUrl: true,
        inventoryTracking: true,
      },
    });

    if (invoicePrefix) {
      await prisma.invoiceSequence.update({
        where: { businessId },
        data: { prefix: invoicePrefix },
      });
    }

    const sequence = await prisma.invoiceSequence.findUnique({
      where: { businessId },
      select: { prefix: true },
    });

    return {
      ...business,
      invoicePrefix: sequence?.prefix ?? "",
    };
  },
};
