export function num(value: unknown): number {
  return Number(value ?? 0);
}

export const INWARD_DISCLAIMER =
  "Based on purchase bills entered in Rakhat. Not reconciled with GSTR-2B. ITC eligibility must be verified on the GST portal.";

export const LIABILITY_DISCLAIMER =
  "Estimated net payable from Rakhat sales and purchase records. Not a substitute for GSTR-3B filing on the GST portal.";
