import { z } from "zod";

export const CreateProductSchema = z.object({
  name: z.string().min(1),
  sellingPrice: z.number().nonnegative(),
  gstRate: z.union([
    z.literal(0),
    z.literal(5),
    z.literal(12),
    z.literal(18),
    z.literal(28),
  ]),
  unit: z.string().min(1),
  hsnCode: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number().nonnegative().default(0), // collective stock on hand
  location: z.string().optional(), // free-text label, e.g. "Shelf A / Warehouse"
});

export const ListProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  search: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type ListProductsQuery = z.infer<typeof ListProductsQuerySchema>;
