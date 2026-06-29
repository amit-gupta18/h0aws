import { chatJson } from "../lib/openai.js";
import { PurchaseService } from "../purchases/purchase.service.js";
import type { CreatePurchaseInput } from "../purchases/purchase.schema.js";
import { OcrExtractSchema, type OcrExtract } from "./gst-intelligence.schema.js";

const OCR_PROMPT = `You are a GST invoice parser for Indian businesses. Extract the following from this supplier invoice image:
- Supplier name
- Supplier GSTIN (15-character alphanumeric)
- Invoice number
- Invoice date (YYYY-MM-DD if possible)
- HSN/SAC code
- Taxable amount
- CGST amount
- SGST amount
- IGST amount
- Total amount

Respond ONLY in JSON with keys: supplierGSTIN, supplierName, invoiceNumber, invoiceDate, hsnCode, taxableAmount, cgst, sgst, igst, totalAmount.
If a field is not found, set it to null.`;

function confidenceLevel(extracted: OcrExtract): "high" | "medium" | "low" {
  const required = [
    extracted.supplierName,
    extracted.invoiceNumber,
    extracted.invoiceDate,
    extracted.taxableAmount,
    extracted.totalAmount,
  ];
  const filled = required.filter((v) => v != null && v !== "").length;
  if (filled >= 5) return "high";
  if (filled >= 3) return "medium";
  return "low";
}

export function mapOcrToPurchase(extracted: OcrExtract): CreatePurchaseInput {
  const cgst = extracted.cgst ?? 0;
  const sgst = extracted.sgst ?? 0;
  const igst = extracted.igst ?? 0;
  const taxable = extracted.taxableAmount ?? 0;
  const total = extracted.totalAmount ?? taxable + cgst + sgst + igst;

  const notes = extracted.hsnCode ? `OCR HSN: ${extracted.hsnCode}` : undefined;

  return {
    supplierName: extracted.supplierName ?? "Unknown Supplier",
    supplierGstin: extracted.supplierGSTIN ?? undefined,
    billNumber: extracted.invoiceNumber ?? `OCR-${Date.now()}`,
    billDate: extracted.invoiceDate ?? new Date().toISOString().slice(0, 10),
    transactionType: igst > 0 ? "INTER_STATE" : "INTRA_STATE",
    taxableAmount: taxable,
    cgstTotal: cgst,
    sgstTotal: sgst,
    igstTotal: igst,
    grandTotal: total,
    notes,
  };
}

export const GstOcrService = {
  async extractFromImage(buffer: Buffer, mimeType: string): Promise<OcrExtract> {
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const result = await chatJson(
      "gpt-4o",
      [
        {
          role: "user",
          content: [
            { type: "text", text: OCR_PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      OcrExtractSchema,
      800
    );

    if (!result) {
      const err = new Error(
        "Could not read invoice. Check image quality or set OPENAI_API_KEY."
      ) as Error & { status: number };
      err.status = 422;
      throw err;
    }

    return result;
  },

  async processImage(
    businessId: string,
    userId: string,
    buffer: Buffer,
    mimeType: string,
    autoSave: boolean
  ) {
    const extracted = await this.extractFromImage(buffer, mimeType);
    const purchaseInput = mapOcrToPurchase(extracted);
    const confidence = confidenceLevel(extracted);

    let savedAs: string | undefined;
    if (autoSave) {
      const bill = await PurchaseService.create(businessId, userId, purchaseInput);
      savedAs = bill.id;
    }

    return {
      extracted: {
        supplierGSTIN: extracted.supplierGSTIN,
        supplierName: extracted.supplierName,
        invoiceNumber: extracted.invoiceNumber,
        invoiceDate: extracted.invoiceDate,
        hsnCode: extracted.hsnCode,
        taxableAmount: extracted.taxableAmount,
        cgst: extracted.cgst,
        sgst: extracted.sgst,
        igst: extracted.igst,
        totalAmount: extracted.totalAmount,
      },
      purchaseInput,
      confidence,
      savedAs,
    };
  },
};
