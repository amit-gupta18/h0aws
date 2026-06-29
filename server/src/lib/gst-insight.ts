import type { GstSummaryData } from "../gst/gst.aggregate.js";
import { filingDeadline, monthLabel } from "../gst/gst.schema.js";
import { chatText, formatInr } from "./openai.js";

type InsightInput = {
  businessName: string;
  month: number;
  year: number;
  outputGST: number;
  inputGST: number;
  netPayable: number;
  b2bCount: number;
  b2cRateGroups: number;
};

function templateInsight(input: InsightInput): string {
  const period = monthLabel(input.month, input.year);
  const deadline = filingDeadline(input.month, input.year);
  if (input.netPayable > 0) {
    return `Your estimated GST payable for ${period} is ${formatInr(input.netPayable)}. GSTR-1 is due by ${deadline}. Verify input tax credit on the GST portal before paying.`;
  }
  if (input.netPayable < 0) {
    return `Your estimated ITC exceeds output tax for ${period} by ${formatInr(Math.abs(input.netPayable))}. GSTR-1 is due by ${deadline}. Carry-forward rules apply — confirm on the GST portal.`;
  }
  return `Your estimated GST payable for ${period} is zero. GSTR-1 is due by ${deadline}. Review purchase bills and portal GSTR-2B before filing.`;
}

export async function generateGstInsight(
  summary: GstSummaryData,
  businessName: string
): Promise<string> {
  const input: InsightInput = {
    businessName,
    month: summary.period.month,
    year: summary.period.year,
    outputGST: summary.liability.outputGST,
    inputGST: summary.liability.inputGST,
    netPayable: summary.liability.netPayable,
    b2bCount: summary.counts.b2bInvoices,
    b2cRateGroups: summary.counts.b2cInvoiceGroups,
  };

  const period = monthLabel(input.month, input.year);
  const prompt = `Given this GST summary for ${businessName} for ${period}:
- Output GST: ${formatInr(input.outputGST)}
- Input GST: ${formatInr(input.inputGST)}
- Net Payable: ${formatInr(input.netPayable)}
- B2B invoices: ${input.b2bCount}
- B2C rate groups: ${input.b2cRateGroups}

Give one plain English sentence telling the business owner their GST position and filing deadline (11th of next month). Keep it simple, no jargon. Max 40 words.`;

  const text = await chatText("gpt-4o-mini", [{ role: "user", content: prompt }], 120);
  return text && text.length > 0 ? text : templateInsight(input);
}
