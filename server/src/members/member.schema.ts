import { z } from "zod";

// Owner provisions a teammate directly and hands over the credentials.
// OWNER is intentionally not assignable here — only the founder is an OWNER.
export const AddMemberSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  role: z.enum(["ACCOUNTANT", "VIEWER"]),
});

export type AddMemberInput = z.infer<typeof AddMemberSchema>;
