// Shared shape every invoice template renders from. Kept template-agnostic so
// new designs (modern, compact) consume the same data contract.

export type InvoiceTemplateItem = {
  nameSnapshot: string;
  hsnSnapshot?: string | null;
  unitSnapshot?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  gstRate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
};

export type InvoiceTemplateData = {
  invoiceNumber: string;
  invoiceDate: string;
  documentType: string;
  transactionType: string;
  paymentMode: string;
  notes?: string | null;
  business: {
    tradeName: string;
    legalName?: string | null;
    gstin?: string | null;
    address?: string | null;
    stateCode: string;
    phone?: string | null;
    logoUrl?: string | null;
  };
  customer: {
    name: string;
    gstin?: string | null;
    billingAddress?: string | null;
    stateCode?: string | null;
  } | null;
  items: InvoiceTemplateItem[];
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
};
