import { z } from "zod";

const taxFields = {
  taxableAmount: z.number().nonnegative(),
  cgstTotal: z.number().nonnegative().default(0),
  sgstTotal: z.number().nonnegative().default(0),
  igstTotal: z.number().nonnegative().default(0),
  grandTotal: z.number().positive(),
};

export const CreatePurchaseSchema = z
  .object({
    supplierName: z.string().min(1),
    supplierGstin: z.string().optional(),
    supplierStateCode: z.string().optional(),
    billNumber: z.string().min(1),
    billDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    transactionType: z.enum(["INTRA_STATE", "INTER_STATE"]).default("INTRA_STATE"),
    ...taxFields,
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      const taxSum = data.cgstTotal + data.sgstTotal + data.igstTotal;
      const expected = data.taxableAmount + taxSum;
      return Math.abs(expected - data.grandTotal) < 0.02;
    },
    { message: "grandTotal must equal taxableAmount + CGST + SGST + IGST" }
  );

export const UpdatePurchaseSchema = CreatePurchaseSchema;

export const ListPurchasesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreatePurchaseInput = z.infer<typeof CreatePurchaseSchema>;
export type UpdatePurchaseInput = z.infer<typeof UpdatePurchaseSchema>;
export type ListPurchasesQuery = z.infer<typeof ListPurchasesQuerySchema>;
