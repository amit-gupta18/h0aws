"use client";

import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { amountToWords } from "@/lib/amount-to-words";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 30,
  },
  header: {
    flexDirection: "row",
    marginBottom: 10,
  },
  headerLeft: {
    width: "70%",
  },
  headerRight: {
    width: "30%",
    borderLeft: "1pt solid #000",
    paddingLeft: 8,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 5,
  },
  businessName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  billTo: {
    flexDirection: "row",
    borderTop: "1pt solid #000",
    paddingTop: 8,
    marginBottom: 10,
  },
  billToLeft: {
    width: "60%",
  },
  billToRight: {
    width: "40%",
    paddingLeft: 8,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  table: {
    borderTop: "1pt solid #000",
    borderBottom: "1pt solid #000",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottom: "1pt solid #000",
    padding: 4,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #ccc",
    padding: 4,
  },
  colNum: { width: "5%" },
  colName: { width: "30%" },
  colHsn: { width: "12%" },
  colQty: { width: "10%", textAlign: "right" },
  colUnit: { width: "8%" },
  colRate: { width: "15%", textAlign: "right" },
  colAmount: { width: "20%", textAlign: "right" },
  summarySection: {
    flexDirection: "row",
    marginTop: 10,
  },
  taxSummary: {
    width: "60%",
    paddingRight: 10,
  },
  totals: {
    width: "40%",
    borderLeft: "1pt solid #000",
    paddingLeft: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  grandTotal: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    borderTop: "1pt solid #000",
    paddingTop: 5,
    marginTop: 5,
  },
  amountWords: {
    marginTop: 10,
    padding: 8,
    borderTop: "1pt solid #000",
    borderBottom: "1pt solid #000",
  },
  footer: {
    flexDirection: "row",
    marginTop: 15,
  },
  bankDetails: {
    width: "50%",
  },
  signatory: {
    width: "50%",
    textAlign: "right",
  },
  declaration: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 8,
    color: "#666",
  },
  taxTableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
  },
  taxTableRow: {
    flexDirection: "row",
    padding: 3,
    fontSize: 7,
  },
  taxColHsn: { width: "15%" },
  taxColTaxable: { width: "20%", textAlign: "right" },
  taxColRate: { width: "10%", textAlign: "right" },
  taxColAmount: { width: "15%", textAlign: "right" },
  infoRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  infoLabel: {
    width: 80,
  },
});

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

type HsnSummary = {
  hsn: string;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
};

function groupByHsn(items: InvoiceTemplateItem[]): HsnSummary[] {
  const map = new Map<string, HsnSummary>();
  for (const item of items) {
    const hsn = item.hsnSnapshot || "N/A";
    const existing = map.get(hsn);
    if (existing) {
      existing.taxableValue += item.taxableValue;
      existing.cgstAmount += item.cgstAmount;
      existing.sgstAmount += item.sgstAmount;
      existing.igstAmount += item.igstAmount;
    } else {
      map.set(hsn, {
        hsn,
        taxableValue: item.taxableValue,
        cgstRate: item.gstRate / 2,
        cgstAmount: item.cgstAmount,
        sgstRate: item.gstRate / 2,
        sgstAmount: item.sgstAmount,
        igstRate: item.gstRate,
        igstAmount: item.igstAmount,
      });
    }
  }
  return Array.from(map.values());
}

export function InvoiceTemplate({ data }: { data: InvoiceTemplateData }) {
  const isInterState = data.transactionType === "INTER_STATE";
  const hsnSummary = groupByHsn(data.items);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {data.business.logoUrl && (
              <Image src={data.business.logoUrl} style={styles.logo} />
            )}
            <Text style={styles.businessName}>{data.business.tradeName}</Text>
            {data.business.legalName && (
              <Text>{data.business.legalName}</Text>
            )}
            {data.business.address && <Text>{data.business.address}</Text>}
            {data.business.gstin && <Text>GSTIN: {data.business.gstin}</Text>}
            {data.business.phone && <Text>Phone: {data.business.phone}</Text>}
          </View>
          <View style={styles.headerRight}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Invoice No:</Text>
              <Text>{data.invoiceNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Invoice Date:</Text>
              <Text>{data.invoiceDate}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Mode:</Text>
              <Text>{data.paymentMode}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Document Type:</Text>
              <Text>{data.documentType.replace("_", " ")}</Text>
            </View>
          </View>
        </View>

        <View style={styles.billTo}>
          <View style={styles.billToLeft}>
            <Text style={styles.sectionTitle}>BILL TO</Text>
            {data.customer ? (
              <>
                <Text>Name: {data.customer.name}</Text>
                {data.customer.billingAddress && (
                  <Text>Address: {data.customer.billingAddress}</Text>
                )}
                {data.customer.gstin && (
                  <Text>GSTIN: {data.customer.gstin}</Text>
                )}
                {data.customer.stateCode && (
                  <Text>State: {data.customer.stateCode}</Text>
                )}
              </>
            ) : (
              <Text>Walk-in Customer</Text>
            )}
          </View>
          <View style={styles.billToRight}>
            {data.notes && (
              <>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text>{data.notes}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colName}>Item Name</Text>
            <Text style={styles.colHsn}>HSN</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colUnit}>Unit</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>
          {data.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colNum}>{idx + 1}</Text>
              <Text style={styles.colName}>{item.nameSnapshot}</Text>
              <Text style={styles.colHsn}>{item.hsnSnapshot || "-"}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{item.unitSnapshot || "-"}</Text>
              <Text style={styles.colRate}>{item.unitPrice.toFixed(2)}</Text>
              <Text style={styles.colAmount}>{item.lineTotal.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summarySection}>
          <View style={styles.taxSummary}>
            <Text style={styles.sectionTitle}>TAX SUMMARY</Text>
            <View style={styles.taxTableHeader}>
              <Text style={styles.taxColHsn}>HSN</Text>
              <Text style={styles.taxColTaxable}>Taxable</Text>
              {isInterState ? (
                <>
                  <Text style={styles.taxColRate}>IGST%</Text>
                  <Text style={styles.taxColAmount}>IGST Amt</Text>
                </>
              ) : (
                <>
                  <Text style={styles.taxColRate}>CGST%</Text>
                  <Text style={styles.taxColAmount}>CGST</Text>
                  <Text style={styles.taxColRate}>SGST%</Text>
                  <Text style={styles.taxColAmount}>SGST</Text>
                </>
              )}
            </View>
            {hsnSummary.map((row, idx) => (
              <View key={idx} style={styles.taxTableRow}>
                <Text style={styles.taxColHsn}>{row.hsn}</Text>
                <Text style={styles.taxColTaxable}>
                  {row.taxableValue.toFixed(2)}
                </Text>
                {isInterState ? (
                  <>
                    <Text style={styles.taxColRate}>{row.igstRate}%</Text>
                    <Text style={styles.taxColAmount}>
                      {row.igstAmount.toFixed(2)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.taxColRate}>{row.cgstRate}%</Text>
                    <Text style={styles.taxColAmount}>
                      {row.cgstAmount.toFixed(2)}
                    </Text>
                    <Text style={styles.taxColRate}>{row.sgstRate}%</Text>
                    <Text style={styles.taxColAmount}>
                      {row.sgstAmount.toFixed(2)}
                    </Text>
                  </>
                )}
              </View>
            ))}
          </View>

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text>Subtotal:</Text>
              <Text>{data.subtotal.toFixed(2)}</Text>
            </View>
            {data.discount > 0 && (
              <View style={styles.totalRow}>
                <Text>Discount:</Text>
                <Text>-{data.discount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text>Taxable Amount:</Text>
              <Text>{data.taxableAmount.toFixed(2)}</Text>
            </View>
            {isInterState ? (
              <View style={styles.totalRow}>
                <Text>IGST:</Text>
                <Text>{data.igstTotal.toFixed(2)}</Text>
              </View>
            ) : (
              <>
                <View style={styles.totalRow}>
                  <Text>CGST:</Text>
                  <Text>{data.cgstTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text>SGST:</Text>
                  <Text>{data.sgstTotal.toFixed(2)}</Text>
                </View>
              </>
            )}
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text>GRAND TOTAL:</Text>
              <Text>{data.grandTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.amountWords}>
          <Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Amount in Words: </Text>
            {amountToWords(data.grandTotal)}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.bankDetails}>
            <Text style={styles.sectionTitle}>BANK DETAILS</Text>
            <Text>Bank: _____________</Text>
            <Text>A/C No: _____________</Text>
            <Text>IFSC: _____________</Text>
          </View>
          <View style={styles.signatory}>
            <Text style={styles.sectionTitle}>Authorised Signatory</Text>
            <Text style={{ marginTop: 30 }}>_____________</Text>
          </View>
        </View>

        <View style={styles.declaration}>
          <Text>Declaration: Goods once sold will not be taken back.</Text>
          <Text>This is a Computer Generated Invoice</Text>
        </View>
      </Page>
    </Document>
  );
}
