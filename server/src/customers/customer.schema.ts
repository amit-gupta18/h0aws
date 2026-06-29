import { z } from "zod";

export const CreateCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  gstin: z.string().optional(),
  stateCode: z.string().optional(),
  billingAddress: z.string().optional(),
});

export const ListCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  search: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof ListCustomersQuerySchema>;
