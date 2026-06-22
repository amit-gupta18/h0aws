import { prisma } from "../lib/prisma.js";
import type { CreateBusinessInput } from "./business.schema.js";

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

      // Default stock location — no UI in V1, but inventory needs a home.
      await tx.location.create({
        data: { businessId: business.id, name: "Main Shop" },
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
};
