import { z } from "zod";

export const CreateCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  gstin: z.string().optional(),
  stateCode: z.string().optional(),
  billingAddress: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
