import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import type { AddMemberInput } from "./member.schema.js";

const BCRYPT_ROUNDS = 12;

export const MemberService = {
  /** Everyone who can act in this business, owner first. */
  async list(businessId: string) {
    const rows = await prisma.businessMember.findMany({
      where: { businessId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((r) => ({
      id: r.id,
      userId: r.user.id,
      email: r.user.email,
      phone: r.user.phone,
      role: r.role,
      createdAt: r.createdAt.toISOString(),
    }));
  },

  /**
   * Owner creates a teammate. If the email is new, a user account is minted
   * with the owner-supplied password (owner hands these credentials over and
   * the teammate logs in directly). If the email already belongs to a user,
   * we simply attach a membership — we never overwrite an existing password.
   */
  async addMember(businessId: string, input: AddMemberInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    const userId = await prisma.$transaction(async (tx) => {
      let id: string;

      if (existingUser) {
        const already = await tx.businessMember.findUnique({
          where: { userId_businessId: { userId: existingUser.id, businessId } },
          select: { id: true },
        });
        if (already) {
          throw Object.assign(new Error("This user is already a member"), { status: 409 });
        }
        id = existingUser.id;
      } else {
        const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
        const user = await tx.user.create({
          data: { email: input.email, phone: input.phone ?? null, passwordHash },
          select: { id: true },
        });
        id = user.id;
      }

      await tx.businessMember.create({
        data: { userId: id, businessId, role: input.role },
      });

      return id;
    });

    return { userId, email: input.email, role: input.role };
  },

  /** Remove a teammate. The last OWNER can never be removed (would orphan the business). */
  async removeMember(businessId: string, memberId: string) {
    const member = await prisma.businessMember.findFirst({
      where: { id: memberId, businessId },
      select: { id: true, role: true },
    });

    if (!member) {
      throw Object.assign(new Error("Member not found"), { status: 404 });
    }

    if (member.role === "OWNER") {
      const ownerCount = await prisma.businessMember.count({
        where: { businessId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        throw Object.assign(new Error("Cannot remove the last owner"), { status: 400 });
      }
    }

    await prisma.businessMember.delete({ where: { id: member.id } });
    return { id: member.id };
  },
};
