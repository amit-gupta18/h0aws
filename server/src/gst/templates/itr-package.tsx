import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type ItrPackageData = {
  businessName: string;
  gstin: string | null;
  fyLabel: string;
  coverSummary: string;
  revenueTotal: number;
  revenueByMonth: { month: string; revenue: number; count: number }[];
  expensesTotal: number;
  expensesByCategory: { category: string; total: number; count: number }[];
  outputCgst: number;
  outputSgst: number;
  outputIgst: number;
  itcClaimed: number;
  netProfitEstimate: number;
  generatedAt: string;
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#111" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#555", marginBottom: 16 },
  section: { marginTop: 14, marginBottom: 6 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 6, borderBottom: "1pt solid #ccc", paddingBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#444" },
  value: { fontFamily: "Helvetica-Bold" },
  cover: { fontSize: 10, lineHeight: 1.5, marginBottom: 12, color: "#333" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#888", textAlign: "center" },
  tableHeader: { flexDirection: "row", borderBottom: "1pt solid #999", paddingBottom: 4, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  tableRow: { flexDirection: "row", paddingVertical: 3, borderBottom: "0.5pt solid #eee" },
  colMonth: { width: "40%" },
  colAmt: { width: "30%", textAlign: "right" },
  colCount: { width: "30%", textAlign: "right" },
});

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ItrPackageDocument({ data }: { data: ItrPackageData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>ITR Preparation Package</Text>
        <Text style={s.subtitle}>
          {data.businessName}
          {data.gstin ? ` · GSTIN ${data.gstin}` : ""} · {data.fyLabel}
        </Text>

        <Text style={s.cover}>{data.coverSummary}</Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Business summary</Text>
          <View style={s.row}>
            <Text style={s.label}>Financial year</Text>
            <Text style={s.value}>{data.fyLabel}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Total revenue (issued invoices)</Text>
            <Text style={s.value}>{fmt(data.revenueTotal)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Total expenses</Text>
            <Text style={s.value}>{fmt(data.expensesTotal)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Net profit estimate</Text>
            <Text style={s.value}>{fmt(data.netProfitEstimate)}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Revenue by month</Text>
          <View style={s.tableHeader}>
            <Text style={s.colMonth}>Month</Text>
            <Text style={s.colAmt}>Revenue</Text>
            <Text style={s.colCount}>Invoices</Text>
          </View>
          {data.revenueByMonth.map((r) => (
            <View key={r.month} style={s.tableRow}>
              <Text style={s.colMonth}>{r.month}</Text>
              <Text style={s.colAmt}>{fmt(r.revenue)}</Text>
              <Text style={s.colCount}>{r.count}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Expenses by category</Text>
          {data.expensesByCategory.length === 0 ? (
            <Text style={s.label}>No expenses recorded in this FY.</Text>
          ) : (
            data.expensesByCategory.map((e) => (
              <View key={e.category} style={s.row}>
                <Text style={s.label}>{e.category}</Text>
                <Text style={s.value}>{fmt(e.total)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>GST summary</Text>
          <View style={s.row}>
            <Text style={s.label}>Output CGST</Text>
            <Text style={s.value}>{fmt(data.outputCgst)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Output SGST</Text>
            <Text style={s.value}>{fmt(data.outputSgst)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Output IGST</Text>
            <Text style={s.value}>{fmt(data.outputIgst)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Input tax credit claimed (purchase bills)</Text>
            <Text style={s.value}>{fmt(data.itcClaimed)}</Text>
          </View>
        </View>

        <Text style={s.footer}>
          Prepared by Rakhat · For CA review and ITR filing · Generated {data.generatedAt}
        </Text>
      </Page>
    </Document>
  );
}
