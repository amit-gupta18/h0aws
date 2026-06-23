"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { amountToWords } from "@/lib/amount-to-words";
import type { InvoiceTemplateData, InvoiceTemplateItem } from "./types";

const BORDER = "1pt solid #111";
const THIN = "0.5pt solid #bbb";
const BOLD = "Helvetica-Bold";
const MIN_ROWS = 12;

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, padding: 20, color: "#111" },
  wrap: { border: BORDER },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottom: BORDER,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 8,
    paddingRight: 8,
  },
  titleSpacer: { width: 90 },
  titleText: { flex: 1, fontSize: 14, fontFamily: BOLD, textAlign: "center" },
  originalTag: { width: 90, fontSize: 7, textAlign: "right" },

  topRow: { flexDirection: "row", borderBottom: BORDER },
  sellerBlock: { width: "55%", borderRight: BORDER, padding: 6 },
  logo: { height: 40, marginBottom: 4 },
  sellerName: { fontFamily: BOLD, fontSize: 10, marginBottom: 2 },
  line: { marginBottom: 1 },

  metaBlock: { width: "45%", flexDirection: "column" },
  metaRow: { flexDirection: "row" },
  mc: { flex: 1, padding: 4, borderBottom: THIN },
  mcR: { flex: 1, padding: 4, borderBottom: THIN, borderLeft: THIN },
  mcLast: { flex: 1, padding: 4 },
  mcLastR: { flex: 1, padding: 4, borderLeft: THIN },
  mlabel: { fontSize: 6.5, color: "#666", marginBottom: 1 },
  mvalue: { fontSize: 8, fontFamily: BOLD },

  buyerRow: { flexDirection: "row", borderBottom: BORDER },
  buyerBlock: { width: "55%", borderRight: BORDER, padding: 6 },
  buyerSectionLabel: { fontSize: 7, color: "#666", marginBottom: 2 },
  buyerName: { fontFamily: BOLD, fontSize: 9, marginBottom: 2 },
  dispatchBlock: { width: "45%", flexDirection: "column" },

  thr: { flexDirection: "row", borderBottom: BORDER, backgroundColor: "#f0f0f0" },
  tr: { flexDirection: "row", borderBottom: THIN, minHeight: 18 },
  tblank: { flexDirection: "row", borderBottom: THIN, height: 18 },

  cSl: { width: "5%", padding: 3, borderRight: THIN, textAlign: "center" },
  cDesc: { width: "33%", padding: 3, borderRight: THIN },
  cHsn: { width: "11%", padding: 3, borderRight: THIN, textAlign: "center" },
  cQty: { width: "10%", padding: 3, borderRight: THIN, textAlign: "right" },
  cUnit: { width: "8%", padding: 3, borderRight: THIN, textAlign: "center" },
  cRate: { width: "13%", padding: 3, borderRight: THIN, textAlign: "right" },
  cAmt: { width: "20%", padding: 3, textAlign: "right" },
  bold: { fontFamily: BOLD },

  tFooter: { flexDirection: "row", borderTop: BORDER },
  tFootLeft: { width: "60%", borderRight: BORDER, padding: 4 },
  tFootRight: { width: "40%", flexDirection: "column" },
  totLine: { flexDirection: "row", justifyContent: "space-between", padding: 4, borderBottom: THIN },
  totLineLast: { flexDirection: "row", justifyContent: "space-between", padding: 4 },
  gtRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: BORDER,
    borderBottom: BORDER,
    padding: 5,
  },
  gtText: { fontFamily: BOLD, fontSize: 9 },

  amtWords: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: BORDER,
    padding: 5,
  },

  gh1: { flexDirection: "row", backgroundColor: "#f0f0f0" },
  gh2: { flexDirection: "row", borderBottom: BORDER, backgroundColor: "#f0f0f0" },
  gdr: { flexDirection: "row", borderBottom: THIN },
  gtr: { flexDirection: "row", borderBottom: BORDER },

  gHsn: { width: "14%", padding: 3, borderRight: THIN },
  gTax: { width: "17%", padding: 3, borderRight: THIN, textAlign: "right" },
  gCgstHdr: { width: "21%", padding: 3, borderRight: THIN, borderBottom: THIN, textAlign: "center" },
  gSgstHdr: { width: "21%", padding: 3, borderRight: THIN, borderBottom: THIN, textAlign: "center" },
  gTotHdr: { width: "27%", padding: 3, textAlign: "center" },
  gRate: { width: "10%", padding: 3, borderRight: THIN, textAlign: "right" },
  gAmt: { width: "11%", padding: 3, borderRight: THIN, textAlign: "right" },
  gTotal: { width: "27%", padding: 3, textAlign: "right" },
  gIgstHdr: { width: "42%", padding: 3, borderRight: THIN, borderBottom: THIN, textAlign: "center" },
  gIgstRate: { width: "21%", padding: 3, borderRight: THIN, textAlign: "right" },
  gIgstAmt: { width: "21%", padding: 3, borderRight: THIN, textAlign: "right" },

  taxWords: { borderBottom: BORDER, padding: 5 },

  bsRow: { flexDirection: "row", borderBottom: BORDER },
  bankCol: { width: "50%", borderRight: BORDER, padding: 6 },
  bankTitle: { fontFamily: BOLD, marginBottom: 4 },
  bankR: { flexDirection: "row", marginBottom: 2 },
  bankK: { width: 98, fontSize: 7, color: "#555" },
  bankV: { fontSize: 7 },
  sigCol: { width: "50%", padding: 6 },
  sigFor: { fontSize: 7, marginBottom: 1 },
  sigBiz: { fontFamily: BOLD, fontSize: 8, marginBottom: 28 },
  sigLine: { textAlign: "right", fontSize: 7 },

  declRow: { borderBottom: BORDER, padding: 5 },
  declBold: { fontFamily: BOLD, fontSize: 7, marginBottom: 1 },
  declText: { fontSize: 7, color: "#444" },
  footer: { padding: 4, textAlign: "center", fontFamily: BOLD, fontSize: 7 },
});

type HsnRow = {
  hsn: string;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
};

function groupByHsn(items: InvoiceTemplateItem[]): HsnRow[] {
  const map = new Map<string, HsnRow>();
  for (const item of items) {
    const hsn = item.hsnSnapshot ?? "N/A";
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

export function ClassicTemplate({ data }: { data: InvoiceTemplateData }) {
  const isInterState = data.transactionType === "INTER_STATE";
  const isBillOfSupply = data.documentType === "BILL_OF_SUPPLY";
  const hsnSummary = groupByHsn(data.items);
  const taxTotal = data.cgstTotal + data.sgstTotal + data.igstTotal;
  const totalQty = data.items.reduce((sum, i) => sum + i.quantity, 0);
  const fillerCount = Math.max(0, MIN_ROWS - data.items.length);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.wrap}>

          <View style={s.titleRow}>
            <View style={s.titleSpacer} />
            <Text style={s.titleText}>
              {isBillOfSupply ? "BILL OF SUPPLY" : "TAX INVOICE"}
            </Text>
            <Text style={s.originalTag}>ORIGINAL FOR RECIPIENT</Text>
          </View>

          <View style={s.topRow}>
            <View style={s.sellerBlock}>
              {data.business.logoUrl != null && (
                <Image src={data.business.logoUrl} style={s.logo} />
              )}
              <Text style={s.sellerName}>
                M/S {data.business.tradeName.toUpperCase()}
              </Text>
              {data.business.address != null && (
                <Text style={s.line}>{data.business.address}</Text>
              )}
              {data.business.gstin != null && (
                <Text style={s.line}>GSTIN/UIN : {data.business.gstin}</Text>
              )}
              {data.business.phone != null && (
                <Text style={s.line}>Phone : {data.business.phone}</Text>
              )}
              <Text style={s.line}>State Name : {data.business.stateCode}</Text>
            </View>

            <View style={s.metaBlock}>
              <View style={s.metaRow}>
                <View style={s.mc}>
                  <Text style={s.mlabel}>Invoice No.</Text>
                  <Text style={s.mvalue}>{data.invoiceNumber}</Text>
                </View>
                <View style={s.mcR}>
                  <Text style={s.mlabel}>Dated</Text>
                  <Text style={s.mvalue}>{data.invoiceDate}</Text>
                </View>
              </View>
              <View style={s.metaRow}>
                <View style={s.mc}>
                  <Text style={s.mlabel}>Delivery Note</Text>
                  <Text style={s.mvalue}> </Text>
                </View>
                <View style={s.mcR}>
                  <Text style={s.mlabel}>Mode / Terms of Payment</Text>
                  <Text style={s.mvalue}>{data.paymentMode}</Text>
                </View>
              </View>
              <View style={s.metaRow}>
                <View style={s.mcLast}>
                  <Text style={s.mlabel}>Reference No. & Date</Text>
                  <Text style={s.mvalue}> </Text>
                </View>
                <View style={s.mcLastR}>
                  <Text style={s.mlabel}>Other References</Text>
                  <Text style={s.mvalue}> </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={s.buyerRow}>
            <View style={s.buyerBlock}>
              <Text style={s.buyerSectionLabel}>BUYER (BILL TO)</Text>
              {data.customer != null ? (
                <View>
                  <Text style={s.buyerName}>
                    M/S {data.customer.name.toUpperCase()}
                  </Text>
                  {data.customer.billingAddress != null && (
                    <Text style={s.line}>{data.customer.billingAddress}</Text>
                  )}
                  {data.customer.gstin != null && (
                    <Text style={s.line}>GSTIN/UIN : {data.customer.gstin}</Text>
                  )}
                  {data.customer.stateCode != null && (
                    <Text style={s.line}>State Name : {data.customer.stateCode}</Text>
                  )}
                </View>
              ) : (
                <Text style={s.buyerName}>Walk-in Customer</Text>
              )}
            </View>

            <View style={s.dispatchBlock}>
              <View style={s.metaRow}>
                <View style={s.mc}>
                  <Text style={s.mlabel}>{"Buyer's Order No."}</Text>
                  <Text style={s.mvalue}> </Text>
                </View>
                <View style={s.mcR}>
                  <Text style={s.mlabel}>Dated</Text>
                  <Text style={s.mvalue}> </Text>
                </View>
              </View>
              <View style={s.metaRow}>
                <View style={s.mc}>
                  <Text style={s.mlabel}>Dispatch Doc No.</Text>
                  <Text style={s.mvalue}> </Text>
                </View>
                <View style={s.mcR}>
                  <Text style={s.mlabel}>Delivery Note Date</Text>
                  <Text style={s.mvalue}> </Text>
                </View>
              </View>
              <View style={s.metaRow}>
                <View style={s.mc}>
                  <Text style={s.mlabel}>Dispatched Through</Text>
                  <Text style={s.mvalue}> </Text>
                </View>
                <View style={s.mcR}>
                  <Text style={s.mlabel}>Destination</Text>
                  <Text style={s.mvalue}> </Text>
                </View>
              </View>
              <View style={s.metaRow}>
                <View style={s.mcLast}>
                  <Text style={s.mlabel}>Terms of Delivery</Text>
                  <Text style={s.mvalue}> </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Items table */}
          <View style={s.thr}>
            <Text style={[s.cSl, s.bold]}>{"Sl\nNo."}</Text>
            <Text style={[s.cDesc, s.bold]}>Description of Goods</Text>
            <Text style={[s.cHsn, s.bold]}>HSN/SAC</Text>
            <Text style={[s.cQty, s.bold]}>Quantity</Text>
            <Text style={[s.cUnit, s.bold]}>Unit</Text>
            <Text style={[s.cRate, s.bold]}>Rate</Text>
            <Text style={[s.cAmt, s.bold]}>Amount</Text>
          </View>

          {data.items.map((item, i) => (
            <View key={i} style={s.tr}>
              <Text style={s.cSl}>{i + 1}</Text>
              <Text style={s.cDesc}>{item.nameSnapshot}</Text>
              <Text style={s.cHsn}>{item.hsnSnapshot ?? ""}</Text>
              <Text style={s.cQty}>{item.quantity}</Text>
              <Text style={s.cUnit}>{item.unitSnapshot ?? ""}</Text>
              <Text style={s.cRate}>{item.unitPrice.toFixed(2)}</Text>
              <Text style={s.cAmt}>{item.lineTotal.toFixed(2)}</Text>
            </View>
          ))}

          {Array.from({ length: fillerCount }).map((_, i) => (
            <View key={`filler-${i}`} style={s.tblank}>
              <Text style={s.cSl}>{" "}</Text>
              <Text style={s.cDesc}>{" "}</Text>
              <Text style={s.cHsn}>{" "}</Text>
              <Text style={s.cQty}>{" "}</Text>
              <Text style={s.cUnit}>{" "}</Text>
              <Text style={s.cRate}>{" "}</Text>
              <Text style={s.cAmt}>{" "}</Text>
            </View>
          ))}

          <View style={s.tFooter}>
            <View style={s.tFootLeft}>
              <Text style={[s.bold, { fontSize: 8 }]}>Total Qty: {totalQty}</Text>
            </View>
            <View style={s.tFootRight}>
              <View style={s.totLine}>
                <Text>Subtotal</Text>
                <Text>{data.subtotal.toFixed(2)}</Text>
              </View>
              {isInterState ? (
                <View style={s.totLineLast}>
                  <Text>IGST</Text>
                  <Text>{data.igstTotal.toFixed(2)}</Text>
                </View>
              ) : (
                <View>
                  <View style={s.totLine}>
                    <Text>CGST</Text>
                    <Text>{data.cgstTotal.toFixed(2)}</Text>
                  </View>
                  <View style={s.totLineLast}>
                    <Text>SGST</Text>
                    <Text>{data.sgstTotal.toFixed(2)}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={s.gtRow}>
            <Text style={s.gtText}>Grand Total</Text>
            <Text style={s.gtText}>INR {data.grandTotal.toFixed(2)}</Text>
          </View>

          <View style={s.amtWords}>
            <Text>
              <Text style={s.bold}>Amount Chargeable (in words) : </Text>
              {amountToWords(data.grandTotal)}
            </Text>
          </View>

          {/* GST Summary */}
          <View style={s.gh1}>
            <Text style={[s.gHsn, s.bold]}>HSN/SAC</Text>
            <Text style={[s.gTax, s.bold, { textAlign: "center" }]}>
              Taxable Value
            </Text>
            {isInterState ? (
              <View style={{ flexDirection: "row" }}>
                <Text style={[s.gIgstHdr, s.bold]}>IGST</Text>
                <Text style={[s.gTotHdr, s.bold]}>Total Tax Amount</Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row" }}>
                <Text style={[s.gCgstHdr, s.bold]}>CGST</Text>
                <Text style={[s.gSgstHdr, s.bold]}>SGST/UTGST</Text>
                <Text style={[s.gTotHdr, s.bold]}>Total Tax Amount</Text>
              </View>
            )}
          </View>

          <View style={s.gh2}>
            <Text style={s.gHsn}> </Text>
            <Text style={s.gTax}> </Text>
            {isInterState ? (
              <View style={{ flexDirection: "row" }}>
                <Text style={s.gIgstRate}>Rate</Text>
                <Text style={s.gIgstAmt}>Amount</Text>
                <Text style={s.gTotal}>{" "}</Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row" }}>
                <Text style={s.gRate}>Rate</Text>
                <Text style={s.gAmt}>Amount</Text>
                <Text style={s.gRate}>Rate</Text>
                <Text style={s.gAmt}>Amount</Text>
                <Text style={s.gTotal}>{" "}</Text>
              </View>
            )}
          </View>

          {hsnSummary.map((row, i) => (
            <View key={i} style={s.gdr}>
              <Text style={s.gHsn}>{row.hsn}</Text>
              <Text style={s.gTax}>{row.taxableValue.toFixed(2)}</Text>
              {isInterState ? (
                <View style={{ flexDirection: "row" }}>
                  <Text style={s.gIgstRate}>{row.igstRate}%</Text>
                  <Text style={s.gIgstAmt}>{row.igstAmount.toFixed(2)}</Text>
                  <Text style={s.gTotal}>{row.igstAmount.toFixed(2)}</Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row" }}>
                  <Text style={s.gRate}>{row.cgstRate}%</Text>
                  <Text style={s.gAmt}>{row.cgstAmount.toFixed(2)}</Text>
                  <Text style={s.gRate}>{row.sgstRate}%</Text>
                  <Text style={s.gAmt}>{row.sgstAmount.toFixed(2)}</Text>
                  <Text style={s.gTotal}>
                    {(row.cgstAmount + row.sgstAmount).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          ))}

          <View style={s.gtr}>
            <Text style={[s.gHsn, s.bold]}>Total</Text>
            <Text style={[s.gTax, s.bold]}>{data.taxableAmount.toFixed(2)}</Text>
            {isInterState ? (
              <View style={{ flexDirection: "row" }}>
                <Text style={s.gIgstRate}>{" "}</Text>
                <Text style={[s.gIgstAmt, s.bold]}>{data.igstTotal.toFixed(2)}</Text>
                <Text style={[s.gTotal, s.bold]}>{data.igstTotal.toFixed(2)}</Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row" }}>
                <Text style={s.gRate}>{" "}</Text>
                <Text style={[s.gAmt, s.bold]}>{data.cgstTotal.toFixed(2)}</Text>
                <Text style={s.gRate}>{" "}</Text>
                <Text style={[s.gAmt, s.bold]}>{data.sgstTotal.toFixed(2)}</Text>
                <Text style={[s.gTotal, s.bold]}>{taxTotal.toFixed(2)}</Text>
              </View>
            )}
          </View>

          <View style={s.taxWords}>
            <Text>
              <Text style={s.bold}>Tax Amount (in words) : </Text>
              {amountToWords(taxTotal)}
            </Text>
          </View>

          <View style={s.bsRow}>
            <View style={s.bankCol}>
              <Text style={s.bankTitle}>{"COMPANY'S BANK DETAILS"}</Text>
              <View style={s.bankR}>
                <Text style={s.bankK}>{"A/c Holder's Name"}</Text>
                <Text style={s.bankV}> : </Text>
              </View>
              <View style={s.bankR}>
                <Text style={s.bankK}>Bank Name</Text>
                <Text style={s.bankV}> : </Text>
              </View>
              <View style={s.bankR}>
                <Text style={s.bankK}>{"A/c No."}</Text>
                <Text style={s.bankV}> : </Text>
              </View>
              <View style={s.bankR}>
                <Text style={s.bankK}>{"Branch & IFSC"}</Text>
                <Text style={s.bankV}> : </Text>
              </View>
            </View>
            <View style={s.sigCol}>
              <Text style={s.sigFor}>for</Text>
              <Text style={s.sigBiz}>{data.business.tradeName.toUpperCase()}</Text>
              <Text style={s.sigLine}>Authorised Signatory</Text>
            </View>
          </View>

          <View style={s.declRow}>
            <Text style={s.declBold}>Declaration</Text>
            <Text style={s.declText}>
              We declare that this invoice shows the actual price of the goods
              described and that all particulars are true and correct.
            </Text>
          </View>

          <View style={s.footer}>
            <Text>This is a Computer Generated Invoice</Text>
          </View>

        </View>
      </Page>
    </Document>
  );
}
