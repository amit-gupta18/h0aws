import { prisma } from "../lib/prisma.js";
import type { GstExportQuery } from "./gst.schema.js";
import { filingDeadline, monthLabel, type GstPeriodQuery } from "./gst.schema.js";
import { INWARD_DISCLAIMER, LIABILITY_DISCLAIMER, num } from "./gst.constants.js";

type SummaryContext = {
  businessName: string;
  month: number;
  year: number;
  from: Date;
  to: Date;
};

export type GstSummaryData = Awaited<ReturnType<typeof buildGstSummary>>;

export async function buildGstSummary(
  businessId: string,
  query: GstPeriodQuery,
  businessName: string
) {
  const ctx: SummaryContext = {
    businessName,
    month: query.month,
    year: query.year,
    from: new Date(Date.UTC(query.year, query.month - 1, 1)),
    to: new Date(Date.UTC(query.year, query.month, 0)),
  };

  const invoiceWhere = {
    businessId,
    status: "ISSUED" as const,
    documentType: "TAX_INVOICE" as const,
    invoiceDate: { gte: ctx.from, lte: ctx.to },
  };

  const purchaseWhere = {
    businessId,
    billDate: { gte: ctx.from, lte: ctx.to },
  };

  const [
    b2bInvoices,
    issuedCount,
    cancelledCount,
    outputAgg,
    inputAgg,
    b2cByRate,
    hsnB2b,
    hsnB2c,
    b2cLarge,
    inwardB2b,
    inwardUnregistered,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        ...invoiceWhere,
        customer: { gstin: { not: null } },
        NOT: { customer: { gstin: "" } },
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        taxableAmount: true,
        cgstTotal: true,
        sgstTotal: true,
        igstTotal: true,
        grandTotal: true,
        customer: { select: { name: true, gstin: true, stateCode: true } },
      },
      orderBy: { invoiceDate: "asc" },
    }),
    prisma.invoice.count({ where: invoiceWhere }),
    prisma.invoice.count({
      where: {
        businessId,
        status: "CANCELLED",
        documentType: "TAX_INVOICE",
        invoiceDate: { gte: ctx.from, lte: ctx.to },
      },
    }),
    prisma.invoice.aggregate({
      where: invoiceWhere,
      _sum: { cgstTotal: true, sgstTotal: true, igstTotal: true },
    }),
    prisma.purchaseBill.aggregate({
      where: purchaseWhere,
      _sum: { cgstTotal: true, sgstTotal: true, igstTotal: true },
    }),
    prisma.$queryRaw<
      {
        rate: unknown;
        taxable: unknown;
        cgst: unknown;
        sgst: unknown;
        igst: unknown;
        total: unknown;
        count: bigint;
      }[]
    >`
      SELECT si."gstRate" AS rate,
             SUM(si."taxableValue") AS taxable,
             SUM(si."cgstAmount") AS cgst,
             SUM(si."sgstAmount") AS sgst,
             SUM(si."igstAmount") AS igst,
             SUM(si."lineTotal") AS total,
             COUNT(DISTINCT i.id)::bigint AS count
      FROM "SaleItem" si
      INNER JOIN "Invoice" i ON i.id = si."invoiceId"
      LEFT JOIN "Customer" c ON c.id = i."customerId"
      WHERE i."businessId" = ${businessId}
        AND i.status = 'ISSUED'
        AND i."documentType" = 'TAX_INVOICE'
        AND i."invoiceDate" >= ${ctx.from}
        AND i."invoiceDate" <= ${ctx.to}
        AND (c."gstin" IS NULL OR c."gstin" = '')
      GROUP BY si."gstRate"
      ORDER BY si."gstRate" ASC
    `,
    prisma.$queryRaw<
      {
        hsn: string;
        unit: string;
        quantity: unknown;
        taxable: unknown;
        cgst: unknown;
        sgst: unknown;
        igst: unknown;
      }[]
    >`
      SELECT COALESCE(NULLIF(si."hsnSnapshot", ''), 'UNKNOWN') AS hsn,
             COALESCE(NULLIF(si."unitSnapshot", ''), 'PCS') AS unit,
             SUM(si.quantity) AS quantity,
             SUM(si."taxableValue") AS taxable,
             SUM(si."cgstAmount") AS cgst,
             SUM(si."sgstAmount") AS sgst,
             SUM(si."igstAmount") AS igst
      FROM "SaleItem" si
      INNER JOIN "Invoice" i ON i.id = si."invoiceId"
      INNER JOIN "Customer" c ON c.id = i."customerId"
      WHERE i."businessId" = ${businessId}
        AND i.status = 'ISSUED'
        AND i."documentType" = 'TAX_INVOICE'
        AND i."invoiceDate" >= ${ctx.from}
        AND i."invoiceDate" <= ${ctx.to}
        AND c."gstin" IS NOT NULL AND c."gstin" <> ''
      GROUP BY 1, 2
      ORDER BY SUM(si."taxableValue") DESC
    `,
    prisma.$queryRaw<
      {
        hsn: string;
        unit: string;
        quantity: unknown;
        taxable: unknown;
        cgst: unknown;
        sgst: unknown;
        igst: unknown;
      }[]
    >`
      SELECT COALESCE(NULLIF(si."hsnSnapshot", ''), 'UNKNOWN') AS hsn,
             COALESCE(NULLIF(si."unitSnapshot", ''), 'PCS') AS unit,
             SUM(si.quantity) AS quantity,
             SUM(si."taxableValue") AS taxable,
             SUM(si."cgstAmount") AS cgst,
             SUM(si."sgstAmount") AS sgst,
             SUM(si."igstAmount") AS igst
      FROM "SaleItem" si
      INNER JOIN "Invoice" i ON i.id = si."invoiceId"
      LEFT JOIN "Customer" c ON c.id = i."customerId"
      WHERE i."businessId" = ${businessId}
        AND i.status = 'ISSUED'
        AND i."documentType" = 'TAX_INVOICE'
        AND i."invoiceDate" >= ${ctx.from}
        AND i."invoiceDate" <= ${ctx.to}
        AND (c."gstin" IS NULL OR c."gstin" = '')
      GROUP BY 1, 2
      ORDER BY SUM(si."taxableValue") DESC
    `,
    prisma.invoice.findMany({
      where: invoiceWhere,
      select: {
        invoiceNumber: true,
        invoiceDate: true,
        grandTotal: true,
        customer: { select: { name: true, gstin: true } },
      },
      orderBy: { invoiceDate: "asc" },
    }).then((rows) =>
      rows.filter(
        (inv) =>
          num(inv.grandTotal) > 250000 &&
          (!inv.customer?.gstin || inv.customer.gstin === "")
      ).map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        grandTotal: inv.grandTotal,
        customer: inv.customer,
      }))
    ),
    prisma.purchaseBill.findMany({
      where: {
        ...purchaseWhere,
        supplierGstin: { not: null },
        NOT: { supplierGstin: "" },
      },
      orderBy: { billDate: "asc" },
    }),
    prisma.purchaseBill.findMany({
      where: {
        ...purchaseWhere,
        OR: [{ supplierGstin: null }, { supplierGstin: "" }],
      },
      orderBy: { billDate: "asc" },
    }),
  ]);

  const b2b = b2bInvoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate.toISOString().slice(0, 10),
    customerName: inv.customer!.name,
    customerGSTIN: inv.customer!.gstin!,
    placeOfSupply: inv.customer!.stateCode,
    taxableAmount: num(inv.taxableAmount),
    cgst: num(inv.cgstTotal),
    sgst: num(inv.sgstTotal),
    igst: num(inv.igstTotal),
    total: num(inv.grandTotal),
  }));

  const b2cRates = b2cByRate.map((row) => ({
    gstRate: num(row.rate),
    invoiceCount: Number(row.count),
    taxableAmount: num(row.taxable),
    cgst: num(row.cgst),
    sgst: num(row.sgst),
    igst: num(row.igst),
    total: num(row.total),
  }));

  const b2cTotals = b2cRates.reduce(
    (acc, r) => ({
      taxableAmount: acc.taxableAmount + r.taxableAmount,
      cgst: acc.cgst + r.cgst,
      sgst: acc.sgst + r.sgst,
      igst: acc.igst + r.igst,
      total: acc.total + r.total,
      invoiceCount: acc.invoiceCount + r.invoiceCount,
    }),
    { taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, total: 0, invoiceCount: 0 }
  );

  const mapHsn = (rows: typeof hsnB2b) =>
    rows.map((r) => ({
      hsnCode: r.hsn,
      unit: r.unit,
      totalQuantity: num(r.quantity),
      taxableValue: num(r.taxable),
      cgst: num(r.cgst),
      sgst: num(r.sgst),
      igst: num(r.igst),
    }));

  const outputGST =
    num(outputAgg._sum.cgstTotal) + num(outputAgg._sum.sgstTotal) + num(outputAgg._sum.igstTotal);
  const inputGST =
    num(inputAgg._sum.cgstTotal) + num(inputAgg._sum.sgstTotal) + num(inputAgg._sum.igstTotal);

  const inward = {
    b2b: inwardB2b.map((p) => ({
      billNumber: p.billNumber,
      billDate: p.billDate.toISOString().slice(0, 10),
      supplierName: p.supplierName,
      supplierGSTIN: p.supplierGstin!,
      taxableAmount: num(p.taxableAmount),
      cgst: num(p.cgstTotal),
      sgst: num(p.sgstTotal),
      igst: num(p.igstTotal),
      total: num(p.grandTotal),
    })),
    unregistered: inwardUnregistered.map((p) => ({
      billNumber: p.billNumber,
      billDate: p.billDate.toISOString().slice(0, 10),
      supplierName: p.supplierName,
      taxableAmount: num(p.taxableAmount),
      cgst: num(p.cgstTotal),
      sgst: num(p.sgstTotal),
      igst: num(p.igstTotal),
      total: num(p.grandTotal),
    })),
  };

  return {
    period: { month: query.month, year: query.year, label: monthLabel(query.month, query.year) },
    b2b,
    b2c: {
      ...b2cTotals,
      byRate: b2cRates,
    },
    b2cLarge: b2cLarge.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate.toISOString().slice(0, 10),
      customerName: inv.customer?.name ?? "Walk-in Customer",
      total: num(inv.grandTotal),
    })),
    hsn: {
      b2b: mapHsn(hsnB2b),
      b2c: mapHsn(hsnB2c),
    },
    documents: {
      issuedInvoices: issuedCount,
      cancelledInvoices: cancelledCount,
      note: "Credit/debit notes not modeled separately; cancelled count shown for reference only.",
    },
    inward,
    inwardDisclaimer: INWARD_DISCLAIMER,
    liability: {
      outputGST,
      inputGST,
      netPayable: outputGST - inputGST,
      disclaimer: LIABILITY_DISCLAIMER,
      filingDeadline: filingDeadline(query.month, query.year),
    },
    counts: {
      b2bInvoices: b2b.length,
      b2cInvoiceGroups: b2cRates.length,
      inwardB2bBills: inward.b2b.length,
    },
  };
}

export function buildCsv(type: GstExportQuery["type"], summary: GstSummaryData): string {
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const row = (...cells: (string | number | null | undefined)[]) =>
    cells.map(escape).join(",");

  if (type === "gstr1_b2b") {
    const lines = [
      row(
        "GSTIN of Recipient",
        "Receiver Name",
        "Invoice Number",
        "Invoice Date",
        "Invoice Value",
        "Taxable Value",
        "CGST",
        "SGST",
        "IGST"
      ),
      ...summary.b2b.map((r) =>
        row(
          r.customerGSTIN,
          r.customerName,
          r.invoiceNumber,
          r.invoiceDate,
          r.total,
          r.taxableAmount,
          r.cgst,
          r.sgst,
          r.igst
        )
      ),
    ];
    return lines.join("\n");
  }

  if (type === "gstr1_hsn_b2b" || type === "gstr1_hsn_b2c") {
    const rows = type === "gstr1_hsn_b2b" ? summary.hsn.b2b : summary.hsn.b2c;
    const lines = [
      row("HSN", "UQC", "Total Quantity", "Taxable Value", "IGST", "CGST", "SGST"),
      ...rows.map((r) =>
        row(r.hsnCode, r.unit, r.totalQuantity, r.taxableValue, r.igst, r.cgst, r.sgst)
      ),
    ];
    return lines.join("\n");
  }

  const lines = [
    row(
      "Supplier GSTIN",
      "Supplier Name",
      "Bill Number",
      "Bill Date",
      "Taxable Value",
      "CGST",
      "SGST",
      "IGST",
      "Total"
    ),
    ...summary.inward.b2b.map((r) =>
      row(
        r.supplierGSTIN,
        r.supplierName,
        r.billNumber,
        r.billDate,
        r.taxableAmount,
        r.cgst,
        r.sgst,
        r.igst,
        r.total
      )
    ),
    ...summary.inward.unregistered.map((r) =>
      row("", r.supplierName, r.billNumber, r.billDate, r.taxableAmount, r.cgst, r.sgst, r.igst, r.total)
    ),
  ];
  return lines.join("\n");
}
