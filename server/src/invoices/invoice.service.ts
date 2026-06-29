import { prisma } from "../lib/prisma.js";
import { calculateGST } from "../lib/gst-engine.js";
import { uploadPdf, deletePdf, pdfExists, getPresignedUrl } from "../lib/r2.js";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { getTemplate, type InvoiceTemplateData } from "./templates/index.js";
import { InventoryService } from "../inventory/inventory.service.js";
import type { CreateInvoiceInput, ListInvoicesQuery, UpdateInvoiceInput } from "./invoice.schema.js";
import type { Prisma } from "@prisma/client";

function getR2Key(businessId: string, invoiceId: string): string {
  return `invoices/${businessId}/${invoiceId}.pdf`;
}

function aggregateProductQuantities(
  items: { productId?: string | undefined; quantity: number }[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    if (!item.productId) continue;
    map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
  }
  return map;
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
        defaultTemplate: true,
        inventoryTracking: true,
      },
    });

    const templateId = input.templateId ?? business.defaultTemplate;

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
          templateId,
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

      if (business.inventoryTracking) {
        const productQuantities = aggregateProductQuantities(input.items);
        for (const [productId, quantity] of productQuantities) {
          await InventoryService.deductForSale(tx, {
            businessId,
            productId,
            quantity,
            sourceId: inv.id,
            performedById: userId,
          });
        }
      }

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
        React.createElement(getTemplate(invoiceWithItems.templateId), {
          data: templateData,
        }) as any
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
        saleItems: {
          orderBy: { sortOrder: "asc" },
          include: { product: { select: { quantity: true } } },
        },
      },
    });

    if (!invoice) {
      const err = new Error("Invoice not found") as Error & { status: number };
      err.status = 404;
      throw err;
    }

    return {
      id: invoice.id,
      customerId: invoice.customerId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
      documentType: invoice.documentType,
      transactionType: invoice.transactionType,
      business: invoice.business,
      customer: invoice.customer,
      items: invoice.saleItems.map((si) => ({
        id: si.id,
        productId: si.productId,
        stockOnHand: si.product ? Number(si.product.quantity) : null,
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
      templateId: invoice.templateId,
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
      React.createElement(getTemplate(invoice.templateId), {
        data: templateData,
      }) as any
    );

    await uploadPdf(r2Key, Buffer.from(pdfBuffer));

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { pdfUrl: r2Key },
    });

    return { url: await getPresignedUrl(r2Key) };
  },

  async update(businessId: string, invoiceId: string, userId: string, input: UpdateInvoiceInput) {
    const existing = await prisma.invoice.findFirst({
      where: { id: invoiceId, businessId },
      include: {
        customer: {
          select: { id: true, name: true, gstin: true, stateCode: true, billingAddress: true },
        },
        saleItems: true,
        business: {
          select: {
            tradeName: true,
            legalName: true,
            gstin: true,
            address: true,
            stateCode: true,
            phone: true,
            logoUrl: true,
            defaultTemplate: true,
            inventoryTracking: true,
          },
        },
      },
    });

    if (!existing) {
      const err = new Error("Invoice not found") as Error & { status: number };
      err.status = 404;
      throw err;
    }

    if (existing.status === "CANCELLED") {
      const err = new Error("Cannot edit a cancelled invoice") as Error & { status: number };
      err.status = 400;
      throw err;
    }

    const business = existing.business;
    const customer = existing.customer;
    const templateId = input.templateId ?? existing.templateId;

    const gstResult = calculateGST({
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
    });

    await prisma.$transaction(async (tx) => {
      if (business.inventoryTracking) {
        const oldQuantities = aggregateProductQuantities(
          existing.saleItems.map((si) => ({
            productId: si.productId ?? undefined,
            quantity: Number(si.quantity),
          }))
        );
        for (const [productId, quantity] of oldQuantities) {
          await InventoryService.restoreForCancel(tx, {
            businessId,
            productId,
            quantity,
            sourceId: invoiceId,
            performedById: userId,
            notes: `Restored for edit of invoice ${existing.invoiceNumber}`,
          });
        }
      }

      await tx.saleItem.deleteMany({ where: { invoiceId } });

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
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
          templateId,
        },
      });

      const saleItemsData = input.items.map((item, idx) => ({
        invoiceId,
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

      if (business.inventoryTracking) {
        const newQuantities = aggregateProductQuantities(input.items);
        for (const [productId, quantity] of newQuantities) {
          await InventoryService.deductForSale(tx, {
            businessId,
            productId,
            quantity,
            sourceId: invoiceId,
            performedById: userId,
          });
        }
      }
    });

    const updated = await this.getById(businessId, invoiceId);

    try {
      const templateData: InvoiceTemplateData = {
        invoiceNumber: updated.invoiceNumber,
        invoiceDate: updated.invoiceDate,
        documentType: updated.documentType,
        transactionType: updated.transactionType,
        paymentMode: updated.paymentMode,
        notes: updated.notes,
        business: updated.business,
        customer: updated.customer,
        items: updated.items.map((si) => ({
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
        subtotal: updated.subtotal,
        discount: updated.discountTotal,
        taxableAmount: updated.taxableAmount,
        cgstTotal: updated.cgstTotal,
        sgstTotal: updated.sgstTotal,
        igstTotal: updated.igstTotal,
        grandTotal: updated.grandTotal,
      };

      const pdfBuffer = await renderToBuffer(
        React.createElement(getTemplate(updated.templateId), {
          data: templateData,
        }) as any
      );

      const r2Key = getR2Key(businessId, invoiceId);
      await uploadPdf(r2Key, Buffer.from(pdfBuffer));

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { pdfUrl: r2Key },
      });
    } catch (err) {
      console.error("PDF regeneration failed:", err);
    }

    return this.getById(businessId, invoiceId);
  },

  async cancel(businessId: string, invoiceId: string, userId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, businessId },
      include: {
        business: { select: { inventoryTracking: true } },
        saleItems: {
          where: { productId: { not: null } },
          select: { productId: true, quantity: true },
        },
      },
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

    await prisma.$transaction(async (tx) => {
      if (invoice.business.inventoryTracking) {
        const productQuantities = new Map<string, number>();
        for (const item of invoice.saleItems) {
          if (!item.productId) continue;
          const qty = Number(item.quantity);
          productQuantities.set(item.productId, (productQuantities.get(item.productId) ?? 0) + qty);
        }

        for (const [productId, quantity] of productQuantities) {
          await InventoryService.restoreForCancel(tx, {
            businessId,
            productId,
            quantity,
            sourceId: invoiceId,
            performedById: userId,
            notes: `Restored from cancelled invoice ${invoice.invoiceNumber}`,
          });
        }
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "CANCELLED" },
      });
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
