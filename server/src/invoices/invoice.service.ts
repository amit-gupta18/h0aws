import { prisma } from "../lib/prisma.js";
import { calculateGST } from "../lib/gst-engine.js";
import { uploadPdf, deletePdf, pdfExists, getPresignedUrl } from "../lib/r2.js";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { InvoiceTemplate, type InvoiceTemplateData } from "./invoice-template.js";
import type { CreateInvoiceInput, ListInvoicesQuery } from "./invoice.schema.js";
import type { Prisma } from "@prisma/client";

function getR2Key(businessId: string, invoiceId: string): string {
  return `invoices/${businessId}/${invoiceId}.pdf`;
}

export const InvoiceService = {
  async create(businessId: string, userId: string, input: CreateInvoiceInput) {
    const existing = await prisma.invoice.findUnique({
      where: { clientBillId: input.clientBillId },
      include: { saleItems: true, customer: true },
    });
    if (existing) {
      return existing;
    }

    const business = await prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: {
        tradeName: true,
        legalName: true,
        gstin: true,
        address: true,
        stateCode: true,
        phone: true,
        logoUrl: true,
      },
    });

    let customer: {
      id: string;
      name: string;
      gstin: string | null;
      stateCode: string | null;
      billingAddress: string | null;
    } | null = null;

    if (input.customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: input.customerId },
        select: { id: true, name: true, gstin: true, stateCode: true, billingAddress: true },
      });
    }

    const gstInput = {
      sellerGSTIN: business.gstin,
      sellerStateCode: business.stateCode,
      buyerStateCode: customer?.stateCode ?? null,
      items: input.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount ?? 0,
        gstRate: item.gstRate,
      })),
    };

    const gstResult = calculateGST(gstInput);

    const invoiceNumberResult = await prisma.$queryRaw<{ invoice_number: string }[]>`
      UPDATE "InvoiceSequence"
      SET "currentVal" = "currentVal" + 1
      WHERE "businessId" = ${businessId}
      RETURNING "prefix" || LPAD("currentVal"::TEXT, 4, '0') AS invoice_number
    `;
    const invoiceNumber = invoiceNumberResult[0]!.invoice_number;

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          businessId,
          customerId: input.customerId ?? null,
          createdById: userId,
          clientBillId: input.clientBillId,
          invoiceNumber,
          invoiceDate: new Date(input.invoiceDate),
          documentType: gstResult.documentType,
          transactionType: gstResult.transactionType,
          subtotal: gstResult.summary.subtotal,
          discount: gstResult.summary.discountTotal,
          taxableAmount: gstResult.summary.taxableAmount,
          cgstTotal: gstResult.summary.cgstTotal,
          sgstTotal: gstResult.summary.sgstTotal,
          igstTotal: gstResult.summary.igstTotal,
          grandTotal: gstResult.summary.grandTotal,
          paymentMode: input.paymentMode,
          notes: input.notes ?? null,
          status: "ISSUED",
        },
      });

      const saleItemsData = input.items.map((item, idx) => ({
        invoiceId: inv.id,
        productId: item.productId ?? null,
        nameSnapshot: item.name,
        hsnSnapshot: item.hsn ?? null,
        unitSnapshot: item.unit ?? "PCS",
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discount: item.discount ?? 0,
        gstRate: item.gstRate,
        taxableValue: gstResult.lines[idx]!.taxableValue,
        cgstAmount: gstResult.lines[idx]!.cgstAmount,
        sgstAmount: gstResult.lines[idx]!.sgstAmount,
        igstAmount: gstResult.lines[idx]!.igstAmount,
        lineTotal: gstResult.lines[idx]!.lineTotal,
        sortOrder: idx,
      }));

      await tx.saleItem.createMany({ data: saleItemsData });

      return inv;
    });

    const invoiceWithItems = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      include: { saleItems: { orderBy: { sortOrder: "asc" } }, customer: true },
    });

    try {
      const templateData: InvoiceTemplateData = {
        invoiceNumber: invoiceWithItems.invoiceNumber,
        invoiceDate: input.invoiceDate,
        documentType: invoiceWithItems.documentType,
        transactionType: invoiceWithItems.transactionType,
        paymentMode: invoiceWithItems.paymentMode,
        notes: invoiceWithItems.notes,
        business: {
          tradeName: business.tradeName,
          legalName: business.legalName,
          gstin: business.gstin,
          address: business.address,
          stateCode: business.stateCode,
          phone: business.phone,
          logoUrl: business.logoUrl,
        },
        customer: customer
          ? {
              name: customer.name,
              gstin: customer.gstin,
              billingAddress: customer.billingAddress,
              stateCode: customer.stateCode,
            }
          : null,
        items: invoiceWithItems.saleItems.map((si) => ({
          nameSnapshot: si.nameSnapshot,
          hsnSnapshot: si.hsnSnapshot,
          unitSnapshot: si.unitSnapshot,
          quantity: Number(si.quantity),
          unitPrice: Number(si.unitPrice),
          discount: Number(si.discount),
          gstRate: Number(si.gstRate),
          taxableValue: Number(si.taxableValue),
          cgstAmount: Number(si.cgstAmount),
          sgstAmount: Number(si.sgstAmount),
          igstAmount: Number(si.igstAmount),
          lineTotal: Number(si.lineTotal),
        })),
        subtotal: Number(invoiceWithItems.subtotal),
        discount: Number(invoiceWithItems.discount),
        taxableAmount: Number(invoiceWithItems.taxableAmount),
        cgstTotal: Number(invoiceWithItems.cgstTotal),
        sgstTotal: Number(invoiceWithItems.sgstTotal),
        igstTotal: Number(invoiceWithItems.igstTotal),
        grandTotal: Number(invoiceWithItems.grandTotal),
      };

      const pdfBuffer = await renderToBuffer(
        React.createElement(InvoiceTemplate, { data: templateData }) as any
      );

      const r2Key = getR2Key(businessId, invoice.id);
      await uploadPdf(r2Key, Buffer.from(pdfBuffer));

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { pdfUrl: r2Key },
      });

      return { ...invoiceWithItems, pdfUrl: r2Key };
    } catch (err) {
      console.error("PDF generation failed:", err);
      return invoiceWithItems;
    }
  },

  async list(businessId: string, query: ListInvoicesQuery) {
    const { page, limit, status, from, to, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = { businessId };

    if (status) {
      where.status = status;
    }

    if (from || to) {
      where.invoiceDate = {};
      if (from) where.invoiceDate.gte = new Date(from);
      if (to) where.invoiceDate.lte = new Date(to);
    }

    if (search) {
      where.invoiceNumber = { contains: search, mode: "insensitive" };
    }

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          grandTotal: true,
          status: true,
          paymentMode: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      data: data.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate.toISOString().slice(0, 10),
        customerName: inv.customer?.name ?? null,
        grandTotal: Number(inv.grandTotal),
        status: inv.status,
        paymentMode: inv.paymentMode,
        createdAt: inv.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  },

  async getById(businessId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, businessId },
      include: {
        business: {
          select: {
            tradeName: true,
            legalName: true,
            gstin: true,
            address: true,
            stateCode: true,
            phone: true,
            logoUrl: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            gstin: true,
            billingAddress: true,
            stateCode: true,
          },
        },
        saleItems: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!invoice) {
      const err = new Error("Invoice not found") as Error & { status: number };
      err.status = 404;
      throw err;
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
      documentType: invoice.documentType,
      transactionType: invoice.transactionType,
      business: invoice.business,
      customer: invoice.customer,
      items: invoice.saleItems.map((si) => ({
        id: si.id,
        nameSnapshot: si.nameSnapshot,
        hsnSnapshot: si.hsnSnapshot,
        unitSnapshot: si.unitSnapshot,
        quantity: Number(si.quantity),
        unitPrice: Number(si.unitPrice),
        discount: Number(si.discount),
        gstRate: Number(si.gstRate),
        taxableValue: Number(si.taxableValue),
        cgstAmount: Number(si.cgstAmount),
        sgstAmount: Number(si.sgstAmount),
        igstAmount: Number(si.igstAmount),
        lineTotal: Number(si.lineTotal),
      })),
      subtotal: Number(invoice.subtotal),
      discountTotal: Number(invoice.discount),
      taxableAmount: Number(invoice.taxableAmount),
      cgstTotal: Number(invoice.cgstTotal),
      sgstTotal: Number(invoice.sgstTotal),
      igstTotal: Number(invoice.igstTotal),
      grandTotal: Number(invoice.grandTotal),
      paymentMode: invoice.paymentMode,
      notes: invoice.notes,
      status: invoice.status,
      pdfUrl: invoice.pdfUrl,
      createdAt: invoice.createdAt.toISOString(),
    };
  },

  async generatePdf(businessId: string, invoiceId: string) {
    const invoice = await this.getById(businessId, invoiceId);

    if (invoice.status === "CANCELLED") {
      const err = new Error("Invoice is cancelled") as Error & { status: number };
      err.status = 404;
      throw err;
    }

    const r2Key = getR2Key(businessId, invoiceId);

    if (await pdfExists(r2Key)) {
      return { url: await getPresignedUrl(r2Key) };
    }

    const templateData: InvoiceTemplateData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      documentType: invoice.documentType,
      transactionType: invoice.transactionType,
      paymentMode: invoice.paymentMode,
      notes: invoice.notes,
      business: invoice.business,
      customer: invoice.customer,
      items: invoice.items.map((si) => ({
        nameSnapshot: si.nameSnapshot,
        hsnSnapshot: si.hsnSnapshot,
        unitSnapshot: si.unitSnapshot,
        quantity: si.quantity,
        unitPrice: si.unitPrice,
        discount: si.discount,
        gstRate: si.gstRate,
        taxableValue: si.taxableValue,
        cgstAmount: si.cgstAmount,
        sgstAmount: si.sgstAmount,
        igstAmount: si.igstAmount,
        lineTotal: si.lineTotal,
      })),
      subtotal: invoice.subtotal,
      discount: invoice.discountTotal,
      taxableAmount: invoice.taxableAmount,
      cgstTotal: invoice.cgstTotal,
      sgstTotal: invoice.sgstTotal,
      igstTotal: invoice.igstTotal,
      grandTotal: invoice.grandTotal,
    };

    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoiceTemplate, { data: templateData }) as any
    );

    await uploadPdf(r2Key, Buffer.from(pdfBuffer));

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { pdfUrl: r2Key },
    });

    return { url: await getPresignedUrl(r2Key) };
  },

  async cancel(businessId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, businessId },
    });

    if (!invoice) {
      const err = new Error("Invoice not found") as Error & { status: number };
      err.status = 404;
      throw err;
    }

    if (invoice.status === "CANCELLED") {
      const err = new Error("Invoice is already cancelled") as Error & { status: number };
      err.status = 400;
      throw err;
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "CANCELLED" },
    });

    try {
      const r2Key = getR2Key(businessId, invoiceId);
      await deletePdf(r2Key);
    } catch {
      // Ignore R2 deletion errors
    }

    return { id: invoiceId, status: "CANCELLED" };
  },
};
