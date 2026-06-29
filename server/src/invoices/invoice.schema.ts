import { z } from "zod";

export const SaleItemSchema = z.object({
  productId: z.string().uuid().optional(),
  name: z.string().min(1),
  hsn: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  gstRate: z.union([
    z.literal(0),
    z.literal(5),
    z.literal(12),
    z.literal(18),
    z.literal(28),
  ]),
});

export const CreateInvoiceSchema = z.object({
  clientBillId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMode: z.enum(["CASH", "UPI", "CARD", "CREDIT"]).default("CASH"),
  // Optional per-invoice override; falls back to the business default template.
  templateId: z.enum(["CLASSIC", "MODERN", "COMPACT"]).optional(),
  notes: z.string().optional(),
  items: z.array(SaleItemSchema).min(1),
});

export const ListInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["ISSUED", "CANCELLED"]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
});

export type SaleItemInput = z.infer<typeof SaleItemSchema>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

export const UpdateInvoiceSchema = z.object({
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMode: z.enum(["CASH", "UPI", "CARD", "CREDIT"]),
  templateId: z.enum(["CLASSIC", "MODERN", "COMPACT"]).optional(),
  notes: z.string().optional(),
  items: z.array(SaleItemSchema).min(1),
});

export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
export type ListInvoicesQuery = z.infer<typeof ListInvoicesQuerySchema>;
