import { z } from "zod";

export const GstPeriodQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const GstExportQuerySchema = GstPeriodQuerySchema.extend({
  type: z.enum(["gstr1_b2b", "gstr1_hsn_b2b", "gstr1_hsn_b2c", "gstr2_inward"]),
});

export type GstPeriodQuery = z.infer<typeof GstPeriodQuerySchema>;
export type GstExportQuery = z.infer<typeof GstExportQuerySchema>;

export function periodBounds(month: number, year: number) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return { from, to };
}

export function monthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function filingDeadline(month: number, year: number) {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return new Date(nextYear, nextMonth - 1, 11).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
