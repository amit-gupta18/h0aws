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

export const UpdateBusinessSchema = z.object({
  tradeName: z.string().min(1).max(120).optional(),
  legalName: z.string().max(120).nullable().optional(),
  gstin: z.string().length(15).nullable().optional(),
  gstinType: z.enum(["REGULAR", "COMPOSITION", "UNREGISTERED"]).optional(),
  address: z.string().max(300).nullable().optional(),
  stateCode: z.string().length(2).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).nullable().optional(),
  invoicePrefix: z.string().min(1).max(10).optional(),
});

export type CreateBusinessInput = z.infer<typeof CreateBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof UpdateBusinessSchema>;
