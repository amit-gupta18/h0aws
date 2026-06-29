import { prisma } from "../lib/prisma.js";
import type { InsightsSummaryQuery } from "./insights.schema.js";

function num(value: unknown): number {
  return Number(value ?? 0);
}

export const InsightsService = {
  async summary(businessId: string, query: InsightsSummaryQuery) {
    const fromDate = new Date(query.from);
    const toDate = new Date(query.to);

    const invoiceWhere = {
      businessId,
      status: "ISSUED" as const,
      invoiceDate: { gte: fromDate, lte: toDate },
    };

    const [
      revenueAgg,
      cancelledCount,
      paymentModes,
      monthlyTrend,
      topCustomers,
      topProducts,
      gstTotals,
      gstByRate,
      hsnSummary,
      transactionSplit,
      b2bSplit,
      expenseAgg,
      expensesByCategory,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.invoice.count({
        where: {
          businessId,
          status: "CANCELLED",
          invoiceDate: { gte: fromDate, lte: toDate },
        },
      }),
      prisma.invoice.groupBy({
        by: ["paymentMode"],
        where: invoiceWhere,
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.$queryRaw<{ month: Date; revenue: unknown; count: bigint }[]>`
        SELECT DATE_TRUNC('month', "invoiceDate") AS month,
               SUM("grandTotal") AS revenue,
               COUNT(*)::bigint AS count
        FROM "Invoice"
        WHERE "businessId" = ${businessId}
          AND status = 'ISSUED'
          AND "invoiceDate" >= ${fromDate}
          AND "invoiceDate" <= ${toDate}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.$queryRaw<
        { customer_id: string | null; name: string | null; revenue: unknown; count: bigint }[]
      >`
        SELECT i."customerId" AS customer_id,
               c.name,
               SUM(i."grandTotal") AS revenue,
               COUNT(*)::bigint AS count
        FROM "Invoice" i
        LEFT JOIN "Customer" c ON c.id = i."customerId"
        WHERE i."businessId" = ${businessId}
          AND i.status = 'ISSUED'
          AND i."invoiceDate" >= ${fromDate}
          AND i."invoiceDate" <= ${toDate}
        GROUP BY i."customerId", c.name
        ORDER BY SUM(i."grandTotal") DESC
        LIMIT 5
      `,
      prisma.$queryRaw<
        {
          product_id: string | null;
          name: string;
          revenue: unknown;
          quantity: unknown;
        }[]
      >`
        SELECT si."productId" AS product_id,
               si."nameSnapshot" AS name,
               SUM(si."lineTotal") AS revenue,
               SUM(si.quantity) AS quantity
        FROM "SaleItem" si
        INNER JOIN "Invoice" i ON i.id = si."invoiceId"
        WHERE i."businessId" = ${businessId}
          AND i.status = 'ISSUED'
          AND i."invoiceDate" >= ${fromDate}
          AND i."invoiceDate" <= ${toDate}
        GROUP BY si."productId", si."nameSnapshot"
        ORDER BY SUM(si."lineTotal") DESC
        LIMIT 5
      `,
      prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: {
          taxableAmount: true,
          cgstTotal: true,
          sgstTotal: true,
          igstTotal: true,
        },
      }),
      prisma.$queryRaw<{ rate: unknown; taxable: unknown; tax: unknown }[]>`
        SELECT si."gstRate" AS rate,
               SUM(si."taxableValue") AS taxable,
               SUM(si."cgstAmount" + si."sgstAmount" + si."igstAmount") AS tax
        FROM "SaleItem" si
        INNER JOIN "Invoice" i ON i.id = si."invoiceId"
        WHERE i."businessId" = ${businessId}
          AND i.status = 'ISSUED'
          AND i."invoiceDate" >= ${fromDate}
          AND i."invoiceDate" <= ${toDate}
        GROUP BY si."gstRate"
        ORDER BY si."gstRate" ASC
      `,
      prisma.$queryRaw<{ hsn: string; taxable: unknown; tax: unknown }[]>`
        SELECT COALESCE(NULLIF(si."hsnSnapshot", ''), 'N/A') AS hsn,
               SUM(si."taxableValue") AS taxable,
               SUM(si."cgstAmount" + si."sgstAmount" + si."igstAmount") AS tax
        FROM "SaleItem" si
        INNER JOIN "Invoice" i ON i.id = si."invoiceId"
        WHERE i."businessId" = ${businessId}
          AND i.status = 'ISSUED'
          AND i."invoiceDate" >= ${fromDate}
          AND i."invoiceDate" <= ${toDate}
        GROUP BY COALESCE(NULLIF(si."hsnSnapshot", ''), 'N/A')
        ORDER BY SUM(si."taxableValue") DESC
        LIMIT 10
      `,
      prisma.invoice.groupBy({
        by: ["transactionType"],
        where: invoiceWhere,
        _sum: { grandTotal: true },
      }),
      prisma.$queryRaw<{ b2b: unknown; b2c: unknown }[]>`
        SELECT
          SUM(CASE WHEN c.gstin IS NOT NULL AND c.gstin <> '' THEN i."grandTotal" ELSE 0 END) AS b2b,
          SUM(CASE WHEN c.gstin IS NULL OR c.gstin = '' THEN i."grandTotal" ELSE 0 END) AS b2c
        FROM "Invoice" i
        LEFT JOIN "Customer" c ON c.id = i."customerId"
        WHERE i."businessId" = ${businessId}
          AND i.status = 'ISSUED'
          AND i."invoiceDate" >= ${fromDate}
          AND i."invoiceDate" <= ${toDate}
      `,
      prisma.expense.aggregate({
        where: {
          businessId,
          expenseDate: { gte: fromDate, lte: toDate },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.groupBy({
        by: ["category"],
        where: {
          businessId,
          expenseDate: { gte: fromDate, lte: toDate },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
    ]);

    const revenue = num(revenueAgg._sum.grandTotal);
    const invoiceCount = revenueAgg._count;
    const totalExpenses = num(expenseAgg._sum.amount);

    const interStateRevenue =
      num(transactionSplit.find((t) => t.transactionType === "INTER_STATE")?._sum.grandTotal) ?? 0;
    const intraStateRevenue =
      num(transactionSplit.find((t) => t.transactionType === "INTRA_STATE")?._sum.grandTotal) ?? 0;

    const b2bRow = b2bSplit[0];

    return {
      period: { from: query.from, to: query.to },
      sales: {
        revenue,
        invoiceCount,
        avgTicketSize: invoiceCount > 0 ? revenue / invoiceCount : 0,
        cancelledCount,
        monthlyTrend: monthlyTrend.map((row) => ({
          month: row.month.toISOString().slice(0, 7),
          revenue: num(row.revenue),
          count: Number(row.count),
        })),
        paymentModes: paymentModes.map((row) => ({
          mode: row.paymentMode,
          amount: num(row._sum.grandTotal),
          count: row._count,
        })),
        topCustomers: topCustomers.map((row) => ({
          customerId: row.customer_id,
          name: row.name ?? "Walk-in Customer",
          revenue: num(row.revenue),
          count: Number(row.count),
        })),
        topProducts: topProducts.map((row) => ({
          productId: row.product_id,
          name: row.name,
          revenue: num(row.revenue),
          quantity: num(row.quantity),
        })),
      },
      gst: {
        taxableAmount: num(gstTotals._sum.taxableAmount),
        cgstTotal: num(gstTotals._sum.cgstTotal),
        sgstTotal: num(gstTotals._sum.sgstTotal),
        igstTotal: num(gstTotals._sum.igstTotal),
        byRate: gstByRate.map((row) => ({
          rate: num(row.rate),
          taxable: num(row.taxable),
          tax: num(row.tax),
        })),
        hsnSummary: hsnSummary.map((row) => ({
          hsn: row.hsn,
          taxable: num(row.taxable),
          tax: num(row.tax),
        })),
        interStateRevenue,
        intraStateRevenue,
        b2bRevenue: num(b2bRow?.b2b),
        b2cRevenue: num(b2bRow?.b2c),
      },
      expenses: {
        total: totalExpenses,
        count: expenseAgg._count,
        byCategory: expensesByCategory.map((row) => ({
          category: row.category,
          amount: num(row._sum.amount),
        })),
      },
      pnl: {
        grossRevenue: revenue,
        totalExpenses,
        netProfit: revenue - totalExpenses,
      },
    };
  },
};
