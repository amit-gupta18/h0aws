import { prisma } from "../lib/prisma.js";
import { chatText, formatInr } from "../lib/openai.js";
import { monthLabel, periodBounds } from "./gst.schema.js";

type Mismatch = {
  supplierName: string;
  supplierGSTIN: string;
  yourClaimedITC: number;
  supplierFiledAmount: number;
  difference: number;
  risk: "none" | "high" | "critical";
  action: string | null;
};

const BASE_MISMATCHES: Mismatch[] = [
  {
    supplierName: "Sharma Steel Traders",
    supplierGSTIN: "09XYZAB1234C1Z2",
    yourClaimedITC: 9000,
    supplierFiledAmount: 4500,
    difference: 4500,
    risk: "high",
    action: "Contact supplier — they may not have filed GSTR-1 correctly",
  },
  {
    supplierName: "Gupta Wholesale",
    supplierGSTIN: "07PQRST5678D1Z3",
    yourClaimedITC: 2700,
    supplierFiledAmount: 2700,
    difference: 0,
    risk: "none",
    action: null,
  },
  {
    supplierName: "Raj Distributors",
    supplierGSTIN: "06LMNOP9012E1Z4",
    yourClaimedITC: 18000,
    supplierFiledAmount: 0,
    difference: 18000,
    risk: "critical",
    action: "Supplier has not filed GSTR-1 — you cannot claim this ITC",
  },
];

function templateSummary(totalAtRisk: number, period: string): string {
  return `₹${totalAtRisk.toLocaleString("en-IN")} of your input tax credit is at risk for ${period}. Raj Distributors hasn't filed their return — follow up immediately before the 20th to avoid a GST notice.`;
}

export const GstReconciliationDemo = {
  async getDemo(businessId: string, month: number, year: number) {
    const { from, to } = periodBounds(month, year);
    const period = monthLabel(month, year);

    const purchaseCount = await prisma.purchaseBill.count({
      where: { businessId, billDate: { gte: from, lte: to } },
    });

    const recentBill = await prisma.purchaseBill.findFirst({
      where: { businessId, billDate: { gte: from, lte: to } },
      orderBy: { billDate: "desc" },
      select: { supplierName: true, supplierGstin: true },
    });

    const mismatches = BASE_MISMATCHES.map((m, i) => ({ ...m }));
    if (recentBill && mismatches[0]) {
      mismatches[0] = {
        ...mismatches[0],
        supplierName: recentBill.supplierName,
        supplierGSTIN: recentBill.supplierGstin ?? mismatches[0].supplierGSTIN,
      };
    }

    const matched = Math.max(12, purchaseCount);
    const mismatched = mismatches.filter((m) => m.risk !== "none").length;
    const totalITCAtRisk = mismatches
      .filter((m) => m.risk !== "none")
      .reduce((s, m) => s + m.difference, 0);

    const prompt = `An Indian SMB has GSTR-2B reconciliation mismatches for ${period}:
- Matched suppliers: ${matched}
- Mismatched: ${mismatched}
- Total ITC at risk: ${formatInr(totalITCAtRisk)}
- Critical: Raj Distributors filed ₹0 against ₹18,000 claimed

Write 2 sentences in plain English for the shop owner. Be urgent but calm. Max 50 words.`;

    const aiSummary =
      (await chatText("gpt-4o-mini", [{ role: "user", content: prompt }], 150)) ??
      templateSummary(totalITCAtRisk, period);

    return {
      period,
      matched,
      mismatched,
      mismatches,
      totalITCAtRisk,
      aiSummary,
      disclaimer: "Demo data — real GSTR-2B sync requires GSP integration (coming Q3 2026).",
    };
  },
};
