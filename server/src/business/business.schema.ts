import { z } from "zod";

export const CreateBusinessSchema = z.object({
  tradeName: z.string().min(1).max(120),
  legalName: z.string().max(120).optional(),
  gstin: z.string().length(15).optional(),
  gstinType: z.enum(["REGULAR", "COMPOSITION", "UNREGISTERED"]).optional(),
  address: z.string().max(300).optional(),
  stateCode: z.string().length(2), // GST 2-digit state code, e.g. "27"
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  invoicePrefix: z.string().min(1).max(10), // e.g. "INV"
});

export type CreateBusinessInput = z.infer<typeof CreateBusinessSchema>;
