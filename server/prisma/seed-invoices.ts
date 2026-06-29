/**
 * Demo seed — invoices, purchase bills, and expenses for hackathon / GST Intelligence.
 *
 * Optimized for:
 *   · GSTR-1 (B2B + B2C + B2C large > ₹2.5L + HSN) on current month
 *   · Composition advisory (FY turnover capped below ₹1.5Cr, intra-state, REGULAR GST)
 *   · Inward register + ITC (purchase bills incl. reconciliation demo suppliers)
 *   · ITR package (monthly revenue + expense categories)
 *   · Payments (CREDIT invoices, 30+ day overdue, customer phones for reminders)
 *   · Inventory opening stock (when business.inventoryTracking is enabled)
 *   · Insights charts (FY trend from April 1)
 *
 * Prerequisites: business with OWNER, customers, products
 *   npm run seed -- <businessId>     # catalog + sample invoices
 *   npm run seed:demo -- <businessId>
 *
 * Env:
 *   SEED_BUSINESS_ID   — business id (or pass as CLI arg)
 *   SEED_FRESH=1       — delete existing invoices, purchase bills, expenses first
 *   SEED_RANDOM=42     — reproducible RNG seed
 *   SEED_MIN_PER_MONTH — default 8 (demo)
 *   SEED_MAX_PER_MONTH — default 13 (demo)
 *   SEED_MAX_TURNOVER  — default 13500000 (₹1.35Cr, keeps composition eligible)
 */

import { PrismaClient, type Customer, type Product } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { calculateGST } from "../src/lib/gst-engine.js";

const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PAYMENT_MODES = ["CASH", "UPI", "CARD", "CREDIT"] as const;
const PAYMENT_WEIGHTS = [0.24, 0.38, 0.16, 0.22];

/** Keep FY turnover under composition ₹1.5Cr threshold */
const DEFAULT_MAX_TURNOVER = 13_500_000;

/** Matches reconciliation demo + OCR pitch suppliers */
const DEMO_PURCHASES = [
  {
    supplierName: "Sharma Steel Traders",
    supplierGstin: "09XYZAB1234C1Z2",
    supplierStateCode: "09",
    billNumber: "PUR-2026-441",
    taxableAmount: 50_000,
    cgstTotal: 4_500,
    sgstTotal: 4_500,
    igstTotal: 0,
    notes: "Demo seed — steel stock",
  },
  {
    supplierName: "Gupta Wholesale",
    supplierGstin: "07PQRST5678D1Z3",
    supplierStateCode: "07",
    billNumber: "PUR-2026-318",
    taxableAmount: 30_000,
    cgstTotal: 2_700,
    sgstTotal: 2_700,
    igstTotal: 0,
    notes: "Demo seed — matched ITC",
  },
  {
    supplierName: "Raj Distributors",
    supplierGstin: "06LMNOP9012E1Z4",
    supplierStateCode: "06",
    billNumber: "PUR-2026-205",
    taxableAmount: 100_000,
    cgstTotal: 9_000,
    sgstTotal: 9_000,
    igstTotal: 0,
    notes: "Demo seed — bulk electronics",
  },
  {
    supplierName: "ABC Wholesale",
    supplierGstin: "09ABCDE1234F1Z5",
    supplierStateCode: "09",
    billNumber: "PUR-2026-112",
    taxableAmount: 25_000,
    cgstTotal: 2_250,
    sgstTotal: 2_250,
    igstTotal: 0,
    notes: "OCR demo reference bill",
  },
] as const;

const EXPENSE_TEMPLATES = [
  { category: "Rent", amount: 18_000, description: "Shop rent" },
  { category: "Salary", amount: 35_000, description: "Staff salaries" },
  { category: "Utilities", amount: 4_500, description: "Electricity + water" },
  { category: "Transport", amount: 6_000, description: "Delivery / freight" },
  { category: "Supplies", amount: 3_200, description: "Packaging & stationery" },
  { category: "Other", amount: 2_500, description: "Misc shop expenses" },
] as const;

type PaymentMode = (typeof PAYMENT_MODES)[number];

function parseArgs() {
  const businessId = process.argv[2] || process.env["SEED_BUSINESS_ID"];
  if (!businessId) {
    console.error("Usage: npm run seed:demo -- <businessId>");
    console.error("Or set SEED_BUSINESS_ID");
    process.exit(1);
  }

  const minPerMonth = Math.max(1, parseInt(process.env["SEED_MIN_PER_MONTH"] ?? "8", 10));
  const maxPerMonth = Math.max(
    minPerMonth,
    parseInt(process.env["SEED_MAX_PER_MONTH"] ?? "13", 10)
  );
  const maxTurnover = Math.max(
    500_000,
    parseInt(process.env["SEED_MAX_TURNOVER"] ?? String(DEFAULT_MAX_TURNOVER), 10)
  );
  const randomSeed =
    process.env["SEED_RANDOM"] != null
      ? parseInt(process.env["SEED_RANDOM"], 10)
      : 42;
  const fresh = process.env["SEED_FRESH"] === "1" || process.env["SEED_FRESH"] === "true";

  return { businessId, minPerMonth, maxPerMonth, maxTurnover, randomSeed, fresh };
}

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function createRng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1));
}

function pickWeighted<T>(rng: () => number, items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pickRandom<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function fyStartDate(ref = new Date()) {
  const y = ref.getMonth() >= 3 ? ref.getFullYear() : ref.getFullYear() - 1;
  return new Date(y, 3, 1);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
}

function toDateOnly(d: Date) {
  return new Date(d.toISOString().split("T")[0] + "T00:00:00.000Z");
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthsBetween(from: Date, to: Date) {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) +
    1
  );
}

function invoicesForMonth(
  rng: () => number,
  monthIndex: number,
  totalMonths: number,
  minPerMonth: number,
  maxPerMonth: number,
  isCurrentMonth: boolean
) {
  const progress = monthIndex / Math.max(totalMonths - 1, 1);
  const trendBoost = Math.round(progress * (maxPerMonth - minPerMonth) * 0.4);
  const seasonal = monthIndex % 3 === 0 ? 2 : monthIndex % 3 === 1 ? 0 : -1;
  const currentBoost = isCurrentMonth ? 4 : 0;
  const base = randInt(rng, minPerMonth, maxPerMonth);
  return clamp(base + trendBoost + seasonal + currentBoost, minPerMonth, maxPerMonth + 6);
}

/** Bias toward higher-ticket products for realistic FY turnover */
function pickProduct(rng: () => number, products: Product[]): Product {
  const sorted = [...products].sort(
    (a, b) => Number(b.sellingPrice) - Number(a.sellingPrice)
  );
  const roll = rng();
  if (roll < 0.28) {
    const top = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.35)));
    return pickRandom(rng, top);
  }
  return pickRandom(rng, products);
}

function buildLineItems(
  rng: () => number,
  products: Product[],
  sellerStateCode: string,
  buyerStateCode: string | null,
  sellerGSTIN: string | null
) {
  const lineCount = randInt(rng, 1, 3);
  const chosen = new Set<number>();
  const items: { product: Product; quantity: number; discount: number }[] = [];

  while (items.length < lineCount) {
    const product = pickProduct(rng, products);
    const idx = products.indexOf(product);
    if (chosen.has(idx)) continue;
    chosen.add(idx);
    const quantity =
      product.unit === "PKT"
        ? randInt(rng, 8, 50)
        : Number(product.sellingPrice) >= 5000
          ? randInt(rng, 1, 3)
          : randInt(rng, 2, 8);
    const discount =
      rng() < 0.12
        ? Math.round(Number(product.sellingPrice) * quantity * (rng() * 0.04) * 100) / 100
        : 0;
    items.push({ product, quantity, discount });
  }

  const gst = calculateGST({
    sellerGSTIN,
    sellerStateCode,
    buyerStateCode,
    items: items.map(({ product, quantity, discount }) => ({
      name: product.name,
      quantity,
      unitPrice: Number(product.sellingPrice),
      discount,
      gstRate: Number(product.gstRate),
    })),
  });

  const saleItems = items.map(({ product, quantity, discount }, idx) => {
    const line = gst.lines[idx];
    return {
      productId: product.id,
      nameSnapshot: product.name,
      hsnSnapshot: product.hsnCode,
      unitSnapshot: product.unit,
      unitPrice: Number(product.sellingPrice),
      quantity,
      discount,
      gstRate: Number(product.gstRate),
      taxableValue: line.taxableValue,
      cgstAmount: line.cgstAmount,
      sgstAmount: line.sgstAmount,
      igstAmount: line.igstAmount,
      lineTotal: line.lineTotal,
      sortOrder: idx,
    };
  });

  return { gst, saleItems };
}

function pickCustomer(
  rng: () => number,
  b2b: Customer[],
  b2c: Customer[]
): Customer | null {
  const roll = rng();
  if (roll < 0.48 && b2b.length > 0) return pickRandom(rng, b2b);
  if (roll < 0.82 && b2c.length > 0) return pickRandom(rng, b2c);
  return null;
}

async function ensureInvoiceSequence(businessId: string) {
  return prisma.invoiceSequence.upsert({
    where: { businessId },
    update: {},
    create: { businessId, prefix: "INV", currentVal: 0 },
  });
}

async function nextInvoiceNumber(businessId: string, prefix: string) {
  const seq = await prisma.invoiceSequence.update({
    where: { businessId },
    data: { currentVal: { increment: 1 } },
  });
  return `${prefix}-${String(seq.currentVal).padStart(4, "0")}`;
}

async function clearDemoData(businessId: string) {
  console.log("SEED_FRESH=1 — clearing invoices, purchase bills, expenses, inventory txns…");
  await prisma.saleItem.deleteMany({
    where: { invoice: { businessId } },
  });
  await prisma.invoice.deleteMany({ where: { businessId } });
  await prisma.inventoryTransaction.deleteMany({ where: { businessId } });
  await prisma.product.updateMany({
    where: { businessId },
    data: { quantity: 0 },
  });
  await prisma.purchaseBill.deleteMany({ where: { businessId } });
  await prisma.expense.deleteMany({ where: { businessId } });
  await prisma.invoiceSequence.update({
    where: { businessId },
    data: { currentVal: 0 },
  }).catch(() =>
    prisma.invoiceSequence.create({
      data: { businessId, prefix: "INV", currentVal: 0 },
    })
  );
}

async function prepareBusinessForDemo(
  businessId: string,
  existingGstin: string | null,
  stateCode: string
) {
  await prisma.business.update({
    where: { id: businessId },
    data: {
      gstinType: "REGULAR",
      gstin: existingGstin ?? "27AABCU9603R1ZM",
      stateCode,
    },
  });
  console.log("Business profile → REGULAR GST (composition advisory eligible)");
}

async function ensureLocalB2CCustomers(businessId: string, stateCode: string) {
  const existing = await prisma.customer.count({
    where: {
      businessId,
      deletedAt: null,
      stateCode,
      OR: [{ gstin: null }, { gstin: "" }],
    },
  });
  if (existing >= 2) return;

  const names = ["Walk-in Retail", "Local Shop Buyer", "Counter Customer"];
  for (const name of names) {
    const dup = await prisma.customer.findFirst({
      where: { businessId, name, deletedAt: null },
    });
    if (dup) continue;
    await prisma.customer.create({
      data: {
        businessId,
        name,
        phone: `98${randInt(() => Math.random(), 10000000, 99999999)}`,
        stateCode,
        billingAddress: `Local, ${stateCode}`,
      },
    });
  }
  console.log("Ensured local B2C customers (no GSTIN, same state)");
}

async function seedInvoices(
  businessId: string,
  minPerMonth: number,
  maxPerMonth: number,
  maxTurnover: number,
  randomSeed: number
) {
  const rng = createRng(randomSeed);

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      members: { where: { role: "OWNER" }, take: 1 },
      customers: { where: { deletedAt: null } },
      products: { where: { deletedAt: null, isActive: true } },
    },
  });

  if (!business) throw new Error(`Business not found: ${businessId}`);
  if (business.members.length === 0) throw new Error("No OWNER member found");
  if (business.customers.length === 0) throw new Error("Run npm run seed first");
  if (business.products.length === 0) throw new Error("Run npm run seed first");

  await prepareBusinessForDemo(businessId, business.gstin, business.stateCode);
  await ensureLocalB2CCustomers(businessId, business.stateCode);

  const refreshed = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    include: {
      members: { where: { role: "OWNER" }, take: 1 },
      customers: { where: { deletedAt: null } },
      products: { where: { deletedAt: null, isActive: true } },
    },
  });

  const createdById = refreshed.members[0].userId;
  const products = refreshed.products;
  const sameState = refreshed.customers.filter((c) => c.stateCode === refreshed.stateCode);
  const b2bPool = sameState.filter((c) => c.gstin && c.gstin.length > 0);
  const b2cPool = sameState.filter((c) => !c.gstin || c.gstin.length === 0);

  const seq = await ensureInvoiceSequence(businessId);
  const prefix = seq.prefix;

  const today = new Date();
  const rangeStart = fyStartDate(today);
  const rangeEnd = today;
  const monthCount = monthsBetween(rangeStart, rangeEnd);
  const currentMonthKey = monthKey(today);

  console.log(`Business: ${refreshed.tradeName} (${businessId})`);
  console.log(
    `FY demo invoices: ${monthKey(rangeStart)} → ${monthKey(rangeEnd)} (${monthCount} months)`
  );
  console.log(
    `  B2B pool: ${b2bPool.length} · B2C pool: ${b2cPool.length} · intra-state only · turnover cap ₹${maxTurnover.toLocaleString("en-IN")}`
  );

  let created = 0;
  let skippedForCap = 0;
  let cancelled = 0;
  let creditCount = 0;
  let b2b = 0;
  let b2c = 0;
  let walkIn = 0;
  let runningTurnover = 0;
  const byMonth = new Map<string, number>();

  for (let m = 0; m < monthCount; m++) {
    if (runningTurnover >= maxTurnover) break;
    const monthStart = startOfMonth(addMonths(rangeStart, m));
    const monthEnd =
      monthKey(monthStart) === currentMonthKey
        ? rangeEnd
        : new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    const isCurrentMonth = monthKey(monthStart) === currentMonthKey;
    const count = invoicesForMonth(
      rng,
      m,
      monthCount,
      minPerMonth,
      maxPerMonth,
      isCurrentMonth
    );
    const daysInRange = Math.max(
      1,
      Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000)) + 1
    );

    for (let i = 0; i < count; i++) {
      if (runningTurnover >= maxTurnover) {
        skippedForCap++;
        break;
      }

      const dayOffset = randInt(rng, 0, daysInRange - 1);
      let invoiceDate = new Date(monthStart);
      invoiceDate.setDate(monthStart.getDate() + dayOffset);
      if (invoiceDate > rangeEnd) invoiceDate.setTime(rangeEnd.getTime());

      const customer = pickCustomer(rng, b2bPool, b2cPool);
      if (!customer) walkIn++;
      else if (customer.gstin) b2b++;
      else b2c++;

      const buyerStateCode = customer?.stateCode ?? refreshed.stateCode;
      const { gst, saleItems } = buildLineItems(
        rng,
        products,
        refreshed.stateCode,
        buyerStateCode,
        refreshed.gstin
      );

      if (runningTurnover + gst.summary.grandTotal > maxTurnover) {
        skippedForCap++;
        continue;
      }

      const invoiceNumber = await nextInvoiceNumber(businessId, prefix);
      const paymentMode = pickWeighted(rng, PAYMENT_MODES, PAYMENT_WEIGHTS) as PaymentMode;
      const isCancelled = rng() < 0.02;

      if (paymentMode === "CREDIT" && !isCancelled) {
        const overdueDays = randInt(rng, 18, 55);
        const backdated = new Date();
        backdated.setDate(backdated.getDate() - overdueDays);
        if (backdated < invoiceDate) invoiceDate = backdated;
      }

      const createdAt = new Date(invoiceDate);
      createdAt.setHours(randInt(rng, 9, 18), randInt(rng, 0, 59), 0, 0);

      await prisma.invoice.create({
        data: {
          businessId,
          customerId: customer?.id ?? null,
          createdById,
          clientBillId: randomUUID(),
          invoiceNumber,
          invoiceDate: toDateOnly(invoiceDate),
          documentType: gst.documentType,
          transactionType: "INTRA_STATE",
          subtotal: gst.summary.subtotal,
          discount: gst.summary.discountTotal,
          taxableAmount: gst.summary.taxableAmount,
          cgstTotal: gst.summary.cgstTotal,
          sgstTotal: gst.summary.sgstTotal,
          igstTotal: 0,
          grandTotal: gst.summary.grandTotal,
          paymentMode,
          notes: rng() < 0.05 ? "Demo seed invoice" : null,
          status: isCancelled ? "CANCELLED" : "ISSUED",
          templateId: refreshed.defaultTemplate,
          createdAt,
          saleItems: { create: saleItems },
        },
      });

      created++;
      if (isCancelled) cancelled++;
      else {
        runningTurnover += gst.summary.grandTotal;
        if (paymentMode === "CREDIT") creditCount++;
      }
      const key = monthKey(invoiceDate);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);

      if (created % 30 === 0) process.stdout.write(`  … ${created} invoices\r`);
    }
  }

  console.log("\nInvoices seeded.");
  console.log(`  Total: ${created} · Issued: ${created - cancelled} · Cancelled: ${cancelled}`);
  console.log(`  B2B: ${b2b} · B2C (named): ${b2c} · Walk-in: ${walkIn} · Credit: ${creditCount}`);
  if (skippedForCap > 0) {
    console.log(`  Skipped (turnover cap): ${skippedForCap}`);
  }
  for (const [key, count] of [...byMonth.entries()].sort()) {
    console.log(`    ${key}: ${count}`);
  }

  return { created, byMonth };
}

async function seedPurchaseBills(
  businessId: string,
  createdById: string,
  randomSeed: number
) {
  const rng = createRng(randomSeed + 1000);
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let created = 0;

  for (const bill of DEMO_PURCHASES) {
    const billDate = toDateOnly(new Date(currentYear, currentMonth, randInt(rng, 3, 22)));
    try {
      await prisma.purchaseBill.create({
        data: {
          businessId,
          createdById,
          supplierName: bill.supplierName,
          supplierGstin: bill.supplierGstin,
          supplierStateCode: bill.supplierStateCode,
          billNumber: bill.billNumber,
          billDate,
          transactionType: "INTRA_STATE",
          taxableAmount: bill.taxableAmount,
          cgstTotal: bill.cgstTotal,
          sgstTotal: bill.sgstTotal,
          igstTotal: bill.igstTotal,
          grandTotal:
            bill.taxableAmount + bill.cgstTotal + bill.sgstTotal + bill.igstTotal,
          notes: bill.notes,
        },
      });
      created++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Unique constraint")) {
        console.log(`  Skip duplicate purchase bill ${bill.billNumber}`);
      } else {
        throw err;
      }
    }
  }

  const fyStart = fyStartDate(today);
  const extraCount = monthsBetween(fyStart, today) - 1;

  for (let i = 0; i < extraCount; i++) {
    const monthStart = startOfMonth(addMonths(fyStart, i));
    if (monthKey(monthStart) === monthKey(today)) continue;

    const taxable = randInt(rng, 15_000, 45_000);
    const tax = Math.round(taxable * 0.09);
    const billNumber = `PUR-FY-${monthKey(monthStart).replace("-", "")}`;

    try {
      await prisma.purchaseBill.create({
        data: {
          businessId,
          createdById,
          supplierName: pickRandom(rng, DEMO_PURCHASES).supplierName,
          supplierGstin: "27AABCS9999S1ZX",
          supplierStateCode: "27",
          billNumber,
          billDate: toDateOnly(new Date(monthStart.getFullYear(), monthStart.getMonth(), 12)),
          transactionType: "INTRA_STATE",
          taxableAmount: taxable,
          cgstTotal: tax,
          sgstTotal: tax,
          igstTotal: 0,
          grandTotal: taxable + tax * 2,
          notes: "Demo seed — monthly purchase",
        },
      });
      created++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Unique constraint")) throw err;
    }
  }

  console.log(`Purchase bills seeded: ${created}`);
}

async function seedExpenses(
  businessId: string,
  createdById: string,
  randomSeed: number
) {
  const rng = createRng(randomSeed + 2000);
  const today = new Date();
  const fyStart = fyStartDate(today);
  const monthCount = monthsBetween(fyStart, today);
  let created = 0;

  for (let m = 0; m < monthCount; m++) {
    const monthStart = startOfMonth(addMonths(fyStart, m));
    const day = randInt(rng, 1, 5);

    for (const tpl of EXPENSE_TEMPLATES) {
      const variance = 0.85 + rng() * 0.3;
      const amount = Math.round(tpl.amount * variance);
      await prisma.expense.create({
        data: {
          businessId,
          createdById,
          category: tpl.category,
          amount,
          description: `${tpl.description} (${monthKey(monthStart)})`,
          expenseDate: toDateOnly(
            new Date(monthStart.getFullYear(), monthStart.getMonth(), day)
          ),
        },
      });
      created++;
    }
  }

  console.log(`Expenses seeded: ${created} (${EXPENSE_TEMPLATES.length}/month × ${monthCount} months)`);
}

async function ensureCustomerPhones(businessId: string, rng: () => number) {
  const missing = await prisma.customer.findMany({
    where: {
      businessId,
      deletedAt: null,
      OR: [{ phone: null }, { phone: "" }],
    },
  });
  for (const c of missing) {
    await prisma.customer.update({
      where: { id: c.id },
      data: { phone: `98${randInt(rng, 10_000_000, 99_999_999)}` },
    });
  }
  if (missing.length > 0) {
    console.log(`Customer phones added: ${missing.length}`);
  }
}

/** Guaranteed overdue CREDIT rows for /dashboard/payments */
async function seedPaymentsShowcase(businessId: string, randomSeed: number) {
  const rng = createRng(randomSeed + 3000);
  await ensureCustomerPhones(businessId, rng);

  const customers = await prisma.customer.findMany({
    where: { businessId, deletedAt: null, phone: { not: null } },
    orderBy: { name: "asc" },
    take: 10,
  });

  const overdueDays = [35, 42, 38, 55, 33, 48, 40, 31];
  let updated = 0;

  for (let i = 0; i < Math.min(8, customers.length); i++) {
    const inv = await prisma.invoice.findFirst({
      where: {
        businessId,
        customerId: customers[i].id,
        status: "ISSUED",
        paymentMode: { not: "CREDIT" },
      },
      orderBy: { grandTotal: "desc" },
    });
    if (!inv) continue;

    const d = new Date();
    d.setDate(d.getDate() - (overdueDays[i] ?? 35));
    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        paymentMode: "CREDIT",
        invoiceDate: toDateOnly(d),
      },
    });
    updated++;
  }

  console.log(`Payments showcase: ${updated} credit invoices (30+ day overdue)`);
}

/** Walk-in B2C invoice > ₹2.5L for GSTR-1 B2C large table */
async function seedB2cLargeInvoice(
  businessId: string,
  createdById: string,
  products: Product[],
  sellerStateCode: string,
  sellerGSTIN: string | null,
  defaultTemplate: string | null
) {
  const exists = await prisma.invoice.findFirst({
    where: {
      businessId,
      status: "ISSUED",
      customerId: null,
      grandTotal: { gt: 250_000 },
      invoiceDate: { gte: startOfMonth(new Date()) },
    },
  });
  if (exists) {
    console.log("B2C large invoice already present — skip");
    return;
  }

  const monitor =
    products.find((p) => Number(p.sellingPrice) >= 10_000) ??
    [...products].sort((a, b) => Number(b.sellingPrice) - Number(a.sellingPrice))[0];
  if (!monitor) return;

  const quantity = Math.ceil(260_000 / (Number(monitor.sellingPrice) * 1.18));
  const gst = calculateGST({
    sellerGSTIN,
    sellerStateCode,
    buyerStateCode: sellerStateCode,
    items: [
      {
        name: monitor.name,
        quantity,
        unitPrice: Number(monitor.sellingPrice),
        discount: 0,
        gstRate: Number(monitor.gstRate),
      },
    ],
  });

  const line = gst.lines[0];
  const seq = await ensureInvoiceSequence(businessId);
  const invoiceNumber = await nextInvoiceNumber(businessId, seq.prefix);
  const invoiceDate = toDateOnly(new Date());

  await prisma.invoice.create({
    data: {
      businessId,
      customerId: null,
      createdById,
      clientBillId: randomUUID(),
      invoiceNumber,
      invoiceDate,
      documentType: gst.documentType,
      transactionType: "INTRA_STATE",
      subtotal: gst.summary.subtotal,
      discount: 0,
      taxableAmount: gst.summary.taxableAmount,
      cgstTotal: gst.summary.cgstTotal,
      sgstTotal: gst.summary.sgstTotal,
      igstTotal: 0,
      grandTotal: gst.summary.grandTotal,
      paymentMode: "UPI",
      notes: "Demo seed — B2C large (walk-in)",
      status: "ISSUED",
      templateId: defaultTemplate,
      saleItems: {
        create: [
          {
            productId: monitor.id,
            nameSnapshot: monitor.name,
            hsnSnapshot: monitor.hsnCode,
            unitSnapshot: monitor.unit,
            unitPrice: Number(monitor.sellingPrice),
            quantity,
            discount: 0,
            gstRate: Number(monitor.gstRate),
            taxableValue: line.taxableValue,
            cgstAmount: line.cgstAmount,
            sgstAmount: line.sgstAmount,
            igstAmount: line.igstAmount,
            lineTotal: line.lineTotal,
            sortOrder: 0,
          },
        ],
      },
    },
  });

  console.log(
    `B2C large invoice: ${invoiceNumber} · ₹${gst.summary.grandTotal.toLocaleString("en-IN")} (walk-in)`
  );
}

async function seedInventoryOpeningStock(
  businessId: string,
  createdById: string,
  randomSeed: number
) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { inventoryTracking: true },
  });
  if (!business?.inventoryTracking) return;

  const products = await prisma.product.findMany({
    where: { businessId, deletedAt: null, isActive: true },
  });
  const rng = createRng(randomSeed + 4000);
  let created = 0;

  for (const product of products) {
    const existing = await prisma.inventoryTransaction.findFirst({
      where: { businessId, productId: product.id, type: "OPENING_STOCK" },
    });
    if (existing) continue;

    const qty = randInt(rng, 40, 180);
    await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: { quantity: qty },
      }),
      prisma.inventoryTransaction.create({
        data: {
          productId: product.id,
          businessId,
          quantityChange: qty,
          type: "OPENING_STOCK",
          performedById: createdById,
          notes: "Demo seed opening stock",
        },
      }),
    ]);
    created++;
  }

  if (created > 0) {
    console.log(`Inventory opening stock: ${created} products`);
  }
}

async function printDemoSummary(businessId: string) {
  const fyStart = toDateOnly(fyStartDate());
  const today = toDateOnly(new Date());

  const [revenue, gstPaid, purchases, expenses, creditOutstanding] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        businessId,
        status: "ISSUED",
        invoiceDate: { gte: fyStart, lte: today },
      },
      _sum: { grandTotal: true, cgstTotal: true, sgstTotal: true, igstTotal: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: {
        businessId,
        status: "ISSUED",
        invoiceDate: { gte: fyStart, lte: today },
      },
      _sum: { cgstTotal: true, sgstTotal: true, igstTotal: true },
    }),
    prisma.purchaseBill.aggregate({
      where: { businessId, billDate: { gte: fyStart, lte: today } },
      _sum: { cgstTotal: true, sgstTotal: true, igstTotal: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { businessId, expenseDate: { gte: fyStart, lte: today } },
      _sum: { amount: true },
    }),
    prisma.invoice.findMany({
      where: {
        businessId,
        status: "ISSUED",
        paymentMode: "CREDIT",
        invoiceDate: { gte: fyStart, lte: today },
      },
      select: { grandTotal: true, invoiceDate: true },
    }),
  ]);

  const turnover = Number(revenue._sum.grandTotal ?? 0);
  const gst =
    Number(gstPaid._sum.cgstTotal ?? 0) +
    Number(gstPaid._sum.sgstTotal ?? 0) +
    Number(gstPaid._sum.igstTotal ?? 0);
  const compositionTax = Math.round(turnover * 0.01);
  const savings = Math.max(0, gst - compositionTax);
  const overdueCutoff = new Date();
  overdueCutoff.setDate(overdueCutoff.getDate() - 30);
  const creditBalance = creditOutstanding.reduce((s, inv) => s + Number(inv.grandTotal), 0);
  const overdueCredit = creditOutstanding.filter(
    (inv) => new Date(inv.invoiceDate) < overdueCutoff
  );

  console.log("\n── Demo readiness (current FY) ──");
  console.log(`  Turnover (issued):  ₹${turnover.toLocaleString("en-IN")}${turnover <= 15_000_000 ? " ✓ composition eligible" : " ⚠ over ₹1.5Cr"}`);
  console.log(`  Output GST paid:    ₹${gst.toLocaleString("en-IN")}`);
  console.log(`  Composition (1%):   ₹${compositionTax.toLocaleString("en-IN")}`);
  console.log(`  Potential savings:  ₹${savings.toLocaleString("en-IN")}`);
  console.log(`  Credit outstanding: ${creditOutstanding.length} invoices · ₹${creditBalance.toLocaleString("en-IN")} (${overdueCredit.length} overdue)`);
  console.log(`  Purchase bills:     ${purchases._count ?? 0}`);
  console.log(`  Expenses total:     ₹${Number(expenses._sum.amount ?? 0).toLocaleString("en-IN")}`);
  console.log("\n  Open /dashboard/gst → GSTR-1 · reconciliation · OCR · ITR");
  console.log("  Open /dashboard/payments → record payment · WhatsApp reminders");
}

async function main() {
  const args = parseArgs();

  if (args.fresh) {
    await clearDemoData(args.businessId);
  }

  const business = await prisma.business.findUnique({
    where: { id: args.businessId },
    include: {
      members: { where: { role: "OWNER" }, take: 1 },
      products: { where: { deletedAt: null, isActive: true } },
    },
  });
  if (!business?.members[0]) {
    throw new Error("Business or OWNER not found");
  }
  const createdById = business.members[0].userId;

  await seedInvoices(
    args.businessId,
    args.minPerMonth,
    args.maxPerMonth,
    args.maxTurnover,
    args.randomSeed
  );
  await seedPaymentsShowcase(args.businessId, args.randomSeed);
  await seedB2cLargeInvoice(
    args.businessId,
    createdById,
    business.products,
    business.stateCode,
    business.gstin,
    business.defaultTemplate
  );
  await seedPurchaseBills(args.businessId, createdById, args.randomSeed);
  await seedExpenses(args.businessId, createdById, args.randomSeed);
  await seedInventoryOpeningStock(args.businessId, createdById, args.randomSeed);
  await printDemoSummary(args.businessId);

  console.log("\nDemo seed completed.");
}

main()
  .catch((err) => {
    console.error("Demo seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
