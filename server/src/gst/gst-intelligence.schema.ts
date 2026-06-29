import { z } from "zod";

export const FyQuerySchema = z.object({
  fyStartYear: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const OcrExtractSchema = z.object({
  supplierGSTIN: z.string().nullable(),
  supplierName: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  hsnCode: z.string().nullable(),
  taxableAmount: z.number().nullable(),
  cgst: z.number().nullable(),
  sgst: z.number().nullable(),
  igst: z.number().nullable(),
  totalAmount: z.number().nullable(),
});

export type OcrExtract = z.infer<typeof OcrExtractSchema>;

export function fyBounds(fyStartYear: number) {
  const from = new Date(Date.UTC(fyStartYear, 3, 1));
  const to = new Date(Date.UTC(fyStartYear + 1, 2, 31));
  return { from, to };
}

export function fyLabel(fyStartYear: number) {
  const end = (fyStartYear + 1) % 100;
  return `FY ${fyStartYear}-${String(end).padStart(2, "0")}`;
}

export function currentFyStartYear(date = new Date()) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return month >= 4 ? year : year - 1;
}
