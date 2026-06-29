import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "../lib/prisma.js";
import { chatText, formatInr } from "../lib/openai.js";
import { uploadPdf } from "../lib/r2.js";
import {
  currentFyStartYear,
  fyBounds,
  fyLabel,
} from "./gst-intelligence.schema.js";
import { ItrPackageDocument, type ItrPackageData } from "./templates/itr-package.js";

function num(value: unknown): number {
  return Number(value ?? 0);
}

function r2Configured(): boolean {
  return !!(
    process.env["R2_ACCOUNT_ID"] &&
    process.env["R2_ACCESS_KEY_ID"] &&
    process.env["R2_SECRET_ACCESS_KEY"] &&
    process.env["R2_BUCKET_NAME"]
  );
}

function itrR2Key(businessId: string, fyStartYear: number): string {
  return `itr-packages/${businessId}/${fyStartYear}.pdf`;
}

function templateCover(
  businessName: string,
  fy: string,
  revenue: number,
  expenses: number,
  profit: number
): string {
  return `This package summarizes ${businessName}'s ${fy} records from Rakhat: ${formatInr(revenue)} revenue, ${formatInr(expenses)} expenses, and an estimated net profit of ${formatInr(profit)}. Hand this to your CA for ITR review and filing. Figures are based on issued invoices and recorded expenses — verify against bank statements.`;
}

export const GstItrService = {
  async buildPackageData(businessId: string, fyStartYear?: number): Promise<ItrPackageData> {
    const fy = fyStartYear ?? currentFyStartYear();
    const { from, to } = fyBounds(fy);

    const business = await prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { tradeName: true, gstin: true },
    });

    const invoiceWhere = {
      businessId,
      status: "ISSUED" as const,
      invoiceDate: { gte: from, lte: to },
    };

    const [
      revenueAgg,
      gstAgg,
      monthlyTrend,
      expensesByCategory,
      expenseAgg,
      purchaseTaxAgg,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: { grandTotal: true },
      }),
      prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: { cgstTotal: true, sgstTotal: true, igstTotal: true },
      }),
      prisma.$queryRaw<{ month: Date; revenue: unknown; count: bigint }[]>`
        SELECT DATE_TRUNC('month', "invoiceDate") AS month,
               SUM("grandTotal") AS revenue,
               COUNT(*)::bigint AS count
        FROM "Invoice"
        WHERE "businessId" = ${businessId}
          AND status = 'ISSUED'
          AND "invoiceDate" >= ${from}
          AND "invoiceDate" <= ${to}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.expense.groupBy({
        by: ["category"],
        where: {
          businessId,
          expenseDate: { gte: from, lte: to },
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: "desc" } },
      }),
      prisma.expense.aggregate({
        where: { businessId, expenseDate: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      prisma.purchaseBill.aggregate({
        where: { businessId, billDate: { gte: from, lte: to } },
        _sum: { cgstTotal: true, sgstTotal: true, igstTotal: true },
      }),
    ]);

    const revenueTotal = num(revenueAgg._sum.grandTotal);
    const expensesTotal = num(expenseAgg._sum.amount);
    const netProfitEstimate = revenueTotal - expensesTotal;
    const label = fyLabel(fy);

    const prompt = `Write a 2-sentence cover note for an ITR preparation PDF for ${business.tradeName}, ${label}:
- Revenue: ${formatInr(revenueTotal)}
- Expenses: ${formatInr(expensesTotal)}
- Estimated net profit: ${formatInr(netProfitEstimate)}

Plain English for a shopkeeper. Mention this is for their CA to review. Max 60 words.`;

    const coverSummary =
      (await chatText("gpt-4o-mini", [{ role: "user", content: prompt }], 150)) ??
      templateCover(business.tradeName, label, revenueTotal, expensesTotal, netProfitEstimate);

    return {
      businessName: business.tradeName,
      gstin: business.gstin,
      fyLabel: label,
      coverSummary,
      revenueTotal,
      revenueByMonth: monthlyTrend.map((r) => ({
        month: new Date(r.month).toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        }),
        revenue: num(r.revenue),
        count: Number(r.count),
      })),
      expensesTotal,
      expensesByCategory: expensesByCategory.map((e) => ({
        category: e.category,
        total: num(e._sum.amount),
        count: e._count,
      })),
      outputCgst: num(gstAgg._sum.cgstTotal),
      outputSgst: num(gstAgg._sum.sgstTotal),
      outputIgst: num(gstAgg._sum.igstTotal),
      itcClaimed:
        num(purchaseTaxAgg._sum.cgstTotal) +
        num(purchaseTaxAgg._sum.sgstTotal) +
        num(purchaseTaxAgg._sum.igstTotal),
      netProfitEstimate,
      generatedAt: new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
  },

  async generatePdf(businessId: string, fyStartYear?: number) {
    const fy = fyStartYear ?? currentFyStartYear();
    const data = await this.buildPackageData(businessId, fy);

    const pdfBuffer = await renderToBuffer(
      React.createElement(ItrPackageDocument, { data }) as any
    );

    const buffer = Buffer.from(pdfBuffer);
    const filename = `itr-package_${data.fyLabel.replace(/\s+/g, "_")}.pdf`;
    const generatedAt = new Date().toISOString();

    if (r2Configured()) {
      const key = itrR2Key(businessId, fy);
      await uploadPdf(key, buffer).catch((err) => {
        console.warn("ITR package R2 upload failed (download still works):", err);
      });
    }

    return { buffer, generatedAt, filename };
  },
};
