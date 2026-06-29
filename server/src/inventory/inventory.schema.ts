import { z } from "zod";

export const AdjustStockSchema = z.object({
  productId: z.string().uuid(),
  quantityChange: z
    .number()
    .refine((n) => n !== 0, { message: "Adjustment cannot be zero" }),
  notes: z.string().min(1, "Reason is required").max(500),
});

export const ListInventoryTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
  productId: z.string().uuid().optional(),
  type: z
    .enum(["OPENING_STOCK", "PURCHASE", "SALE", "MANUAL_ADJUSTMENT"])
    .optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;
export type ListInventoryTransactionsQuery = z.infer<
  typeof ListInventoryTransactionsQuerySchema
>;
