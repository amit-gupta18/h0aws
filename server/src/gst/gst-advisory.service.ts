import { prisma } from "../lib/prisma.js";
import { chatText, formatInr } from "../lib/openai.js";
import { currentFyStartYear, fyBounds, fyLabel } from "./gst-intelligence.schema.js";

const TURNOVER_LIMIT = 1_50_00_000;
const COMPOSITION_RATE = 0.01;

function num(value: unknown): number {
  return Number(value ?? 0);
}

function templateAdvice(
  eligible: boolean,
  savings: number,
  turnover: number,
  gstPaid: number,
  compositionTax: number
): string {
  if (!eligible) {
    if (turnover > TURNOVER_LIMIT) {
      return `Your turnover is ${formatInr(turnover)}, above the ₹1.5 crore limit for the composition scheme. Stay on regular GST and keep claiming input tax credit on purchases.`;
    }
    return `Based on your sales pattern, you may not qualify for the composition scheme (interstate sales or registration type). Talk to a tax consultant before switching.`;
  }
  if (savings > 0) {
    return `You're paying ${formatInr(gstPaid)} in GST this year. Under composition scheme you'd pay about ${formatInr(compositionTax)} — saving roughly ${formatInr(savings)}. You look eligible; confirm with a CA before the next financial year.`;
  }
  return `Composition scheme may not save you money right now. Your current GST (${formatInr(gstPaid)}) is lower than the estimated 1% turnover tax (${formatInr(compositionTax)}).`;
}

export const GstAdvisoryService = {
  async composition(businessId: string, fyStartYear?: number) {
    const fy = fyStartYear ?? currentFyStartYear();
    const { from, to } = fyBounds(fy);

    const business = await prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { tradeName: true, gstinType: true },
    });

    const invoiceWhere = {
      businessId,
      status: "ISSUED" as const,
      invoiceDate: { gte: from, lte: to },
    };

    const [revenueAgg, gstAgg, interstateCount] = await Promise.all([
      prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: { grandTotal: true },
      }),
      prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: { cgstTotal: true, sgstTotal: true, igstTotal: true },
      }),
      prisma.invoice.count({
        where: { ...invoiceWhere, transactionType: "INTER_STATE" },
      }),
    ]);

    const turnover = num(revenueAgg._sum.grandTotal);
    const gstPaid =
      num(gstAgg._sum.cgstTotal) +
      num(gstAgg._sum.sgstTotal) +
      num(gstAgg._sum.igstTotal);
    const compositionTax = Math.round(turnover * COMPOSITION_RATE);
    const potentialSavings = Math.max(0, Math.round(gstPaid - compositionTax));

    const eligible =
      business.gstinType === "REGULAR" &&
      turnover <= TURNOVER_LIMIT &&
      interstateCount === 0;

    const prompt = `A small Indian retail business has the following GST data for ${fyLabel(fy)}:
- Annual turnover: ${formatInr(turnover)}
- GST paid this year: ${formatInr(gstPaid)}
- Estimated GST under composition scheme (1%): ${formatInr(compositionTax)}
- Potential savings: ${formatInr(potentialSavings)}
- Eligible for composition scheme: ${eligible ? "yes" : "no"}
- Interstate sales in FY: ${interstateCount}

Write 2-3 plain English sentences advising the owner whether to switch.
No jargon. Talk like you're explaining to a shopkeeper with no accounting knowledge.
If eligible and savings > 0, be clear and direct about the recommendation.`;

    const aiAdvice =
      (await chatText("gpt-4o-mini", [{ role: "user", content: prompt }], 200)) ??
      templateAdvice(eligible, potentialSavings, turnover, gstPaid, compositionTax);

    return {
      eligible,
      currentGSTPaid: gstPaid,
      compositionTax,
      potentialSavings,
      annualTurnover: turnover,
      aiAdvice,
      fyStartYear: fy,
      fyLabel: fyLabel(fy),
      schemeDetails: {
        taxRate: "1% of turnover",
        filingFrequency: "Quarterly (CMP-08) instead of monthly",
        restrictions: ["No interstate sales", "No input tax credit"],
      },
    };
  },
};
