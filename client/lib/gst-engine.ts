import { Decimal } from "decimal.js";

export type GSTInput = {
  sellerGSTIN: string | null;
  sellerStateCode: string;
  buyerStateCode: string | null;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    gstRate: number;
  }[];
};

export type GSTLineOutput = {
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
};

export type GSTSummary = {
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
};

export type GSTOutput = {
  documentType: "TAX_INVOICE" | "BILL_OF_SUPPLY";
  transactionType: "INTRA_STATE" | "INTER_STATE";
  lines: GSTLineOutput[];
  summary: GSTSummary;
};

export function calculateGST(input: GSTInput): GSTOutput {
  const { sellerGSTIN, sellerStateCode, buyerStateCode, items } = input;

  const allZeroRate = items.every((item) => item.gstRate === 0);
  const isBillOfSupply = !sellerGSTIN || allZeroRate;

  const documentType: "TAX_INVOICE" | "BILL_OF_SUPPLY" = isBillOfSupply
    ? "BILL_OF_SUPPLY"
    : "TAX_INVOICE";

  const isIntraState =
    buyerStateCode === null || sellerStateCode === buyerStateCode;
  const transactionType: "INTRA_STATE" | "INTER_STATE" = isIntraState
    ? "INTRA_STATE"
    : "INTER_STATE";

  let subtotal = new Decimal(0);
  let discountTotal = new Decimal(0);
  let taxableAmount = new Decimal(0);
  let cgstTotal = new Decimal(0);
  let sgstTotal = new Decimal(0);
  let igstTotal = new Decimal(0);
  let grandTotal = new Decimal(0);

  const lines: GSTLineOutput[] = items.map((item) => {
    const qty = new Decimal(item.quantity);
    const price = new Decimal(item.unitPrice);
    const discount = new Decimal(item.discount);
    const rate = new Decimal(item.gstRate);

    const lineSubtotal = qty.times(price);
    const taxableValue = lineSubtotal.minus(discount);

    subtotal = subtotal.plus(lineSubtotal);
    discountTotal = discountTotal.plus(discount);
    taxableAmount = taxableAmount.plus(taxableValue);

    let cgstAmount = new Decimal(0);
    let sgstAmount = new Decimal(0);
    let igstAmount = new Decimal(0);

    if (!isBillOfSupply && item.gstRate > 0) {
      if (isIntraState) {
        const halfRate = rate.dividedBy(2);
        cgstAmount = taxableValue.times(halfRate).dividedBy(100);
        sgstAmount = taxableValue.times(halfRate).dividedBy(100);
      } else {
        igstAmount = taxableValue.times(rate).dividedBy(100);
      }
    }

    cgstTotal = cgstTotal.plus(cgstAmount);
    sgstTotal = sgstTotal.plus(sgstAmount);
    igstTotal = igstTotal.plus(igstAmount);

    const lineTotal = taxableValue.plus(cgstAmount).plus(sgstAmount).plus(igstAmount);
    grandTotal = grandTotal.plus(lineTotal);

    return {
      taxableValue: taxableValue.toDecimalPlaces(2).toNumber(),
      cgstAmount: cgstAmount.toDecimalPlaces(2).toNumber(),
      sgstAmount: sgstAmount.toDecimalPlaces(2).toNumber(),
      igstAmount: igstAmount.toDecimalPlaces(2).toNumber(),
      lineTotal: lineTotal.toDecimalPlaces(2).toNumber(),
    };
  });

  return {
    documentType,
    transactionType,
    lines,
    summary: {
      subtotal: subtotal.toDecimalPlaces(2).toNumber(),
      discountTotal: discountTotal.toDecimalPlaces(2).toNumber(),
      taxableAmount: taxableAmount.toDecimalPlaces(2).toNumber(),
      cgstTotal: cgstTotal.toDecimalPlaces(2).toNumber(),
      sgstTotal: sgstTotal.toDecimalPlaces(2).toNumber(),
      igstTotal: igstTotal.toDecimalPlaces(2).toNumber(),
      grandTotal: grandTotal.toDecimalPlaces(2).toNumber(),
    },
  };
}
