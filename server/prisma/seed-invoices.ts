/**
 * Seed historical invoices for demo / insights charts.
 *
 * Requires an existing business with customers and products (run prisma/seed.ts first
 * if you need sample catalog data).
 *
 * Usage:
 *   cd server
 *   npx tsx --env-file=.env prisma/seed-invoices.ts <businessId>
 *
 * Options (env):
 *   SEED_BUSINESS_ID   — business id (alternative to CLI arg)
 *   SEED_MONTHS        — months of history (default 9, range 8–10 recommended)
 *   SEED_MIN_PER_MONTH — min invoices per month (default 6)
 *   SEED_MAX_PER_MONTH — max invoices per month (default 14)
 *   SEED_RANDOM        — integer seed for reproducible output (optional)
 *
 * Example:
 *   SEED_MONTHS=10 SEED_MIN_PER_MONTH=8 SEED_MAX_PER_MONTH=16 \
 *     npx tsx --env-file=.env prisma/seed-invoices.ts <businessId>
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
const PAYMENT_WEIGHTS = [0.28, 0.42, 0.22, 0.08];

type PaymentMode = (typeof PAYMENT_MODES)[number];

function parseArgs() {
  const businessId = process.argv[2] || process.env["SEED_BUSINESS_ID"];
  if (!businessId) {
    console.error("Usage: npx tsx --env-file=.env prisma/seed-invoices.ts <businessId>");
    console.error("Or set SEED_BUSINESS_ID");
    process.exit(1);
  }

  const months = clamp(
    parseInt(process.env["SEED_MONTHS"] ?? "9", 10),
    8,
    10
  );
  const minPerMonth = Math.max(1, parseInt(process.env["SEED_MIN_PER_MONTH"] ?? "6", 10));
  const maxPerMonth = Math.max(
    minPerMonth,
    parseInt(process.env["SEED_MAX_PER_MONTH"] ?? "14", 10)
  );
  const randomSeed =
    process.env["SEED_RANDOM"] != null
      ? parseInt(process.env["SEED_RANDOM"], 10)
      : undefined;

  return { businessId, months, minPerMonth, maxPerMonth, randomSeed };
}

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Simple seeded PRNG (mulberry32) for reproducible demo data. */
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

/** Slight upward trend + mild seasonality for richer charts. */
function invoicesForMonth(
  rng: () => number,
  monthIndex: number,
  totalMonths: number,
  minPerMonth: number,
  maxPerMonth: number
) {
  const progress = monthIndex / Math.max(totalMonths - 1, 1);
  const trendBoost = Math.round(progress * (maxPerMonth - minPerMonth) * 0.35);
  const seasonal =
    monthIndex % 3 === 0 ? 1 : monthIndex % 3 === 1 ? 0 : -1;
  const base = randInt(rng, minPerMonth, maxPerMonth);
  return clamp(base + trendBoost + seasonal, minPerMonth, maxPerMonth);
}

function buildLineItems(
  rng: () => number,
  products: Product[],
  sellerStateCode: string,
  buyerStateCode: string | null,
  sellerGSTIN: string | null
) {
  const lineCount = randInt(rng, 1, 4);
  const chosen = new Set<number>();
  const items: {
    product: Product;
    quantity: number;
    discount: number;
  }[] = [];

  while (items.length < lineCount) {
    const idx = Math.floor(rng() * products.length);
    if (chosen.has(idx)) continue;
    chosen.add(idx);
    const product = products[idx];
    const quantity =
      product.unit === "PKT"
        ? randInt(rng, 5, 40)
        : randInt(rng, 1, 6);
    const discount =
      rng() < 0.15
        ? Math.round(Number(product.sellingPrice) * quantity * (rng() * 0.05) * 100) / 100
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

async function seedInvoices(
  businessId: string,
  months: number,
  minPerMonth: number,
  maxPerMonth: number,
  randomSeed?: number
) {
  const rng = createRng(randomSeed ?? Date.now());

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      members: { where: { role: "OWNER" }, take: 1 },
      customers: { where: { deletedAt: null } },
      products: { where: { deletedAt: null, isActive: true } },
    },
  });

  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }
  if (business.members.length === 0) {
    throw new Error("No OWNER member found for business");
  }
  if (business.customers.length === 0) {
    throw new Error("No customers found — run prisma/seed.ts first or add customers manually");
  }
  if (business.products.length === 0) {
    throw new Error("No products found — run prisma/seed.ts first or add products manually");
  }

  const createdById = business.members[0].userId;
  const customers = business.customers;
  const products = business.products;

  const seq = await ensureInvoiceSequence(businessId);
  const prefix = seq.prefix;

  const today = new Date();
  const rangeStart = startOfMonth(addMonths(today, -(months - 1)));
  const rangeEnd = today;

  console.log(`Business: ${business.tradeName} (${businessId})`);
  console.log(
    `Generating ~${minPerMonth}-${maxPerMonth} invoices/month for ${months} months ` +
      `(${monthKey(rangeStart)} → ${monthKey(rangeEnd)})`
  );

  let created = 0;
  let cancelled = 0;
  let walkIn = 0;
  const byMonth = new Map<string, number>();

  for (let m = 0; m < months; m++) {
    const monthStart = startOfMonth(addMonths(rangeStart, m));
    const monthEnd =
      m === months - 1
        ? rangeEnd
        : new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    const count = invoicesForMonth(rng, m, months, minPerMonth, maxPerMonth);
    const daysInRange = Math.max(
      1,
      Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000)) + 1
    );

    for (let i = 0; i < count; i++) {
      const dayOffset = randInt(rng, 0, daysInRange - 1);
      const invoiceDate = new Date(monthStart);
      invoiceDate.setDate(monthStart.getDate() + dayOffset);
      if (invoiceDate > rangeEnd) invoiceDate.setTime(rangeEnd.getTime());

      const useWalkIn = rng() < 0.12;
      const customer: Customer | null = useWalkIn ? null : pickRandom(rng, customers);
      if (useWalkIn) walkIn++;

      const buyerStateCode = customer?.stateCode ?? business.stateCode;
      const { gst, saleItems } = buildLineItems(
        rng,
        products,
        business.stateCode,
        buyerStateCode,
        business.gstin
      );

      const invoiceNumber = await nextInvoiceNumber(businessId, prefix);
      const paymentMode = pickWeighted(rng, PAYMENT_MODES, PAYMENT_WEIGHTS) as PaymentMode;
      const isCancelled = rng() < 0.03;

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
          transactionType: gst.transactionType,
          subtotal: gst.summary.subtotal,
          discount: gst.summary.discountTotal,
          taxableAmount: gst.summary.taxableAmount,
          cgstTotal: gst.summary.cgstTotal,
          sgstTotal: gst.summary.sgstTotal,
          igstTotal: gst.summary.igstTotal,
          grandTotal: gst.summary.grandTotal,
          paymentMode,
          notes: rng() < 0.08 ? "Demo seed invoice" : null,
          status: isCancelled ? "CANCELLED" : "ISSUED",
          templateId: business.defaultTemplate,
          createdAt,
          saleItems: { create: saleItems },
        },
      });

      created++;
      if (isCancelled) cancelled++;
      const key = monthKey(invoiceDate);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);

      if (created % 25 === 0) {
        process.stdout.write(`  … ${created} invoices\r`);
      }
    }
  }

  console.log("\nInvoice seed completed.");
  console.log(`  Total invoices : ${created}`);
  console.log(`  Issued         : ${created - cancelled}`);
  console.log(`  Cancelled      : ${cancelled}`);
  console.log(`  Walk-in        : ${walkIn}`);
  console.log("  By month:");
  for (const [key, count] of [...byMonth.entries()].sort()) {
    console.log(`    ${key}: ${count}`);
  }
}

const args = parseArgs();

seedInvoices(
  args.businessId,
  args.months,
  args.minPerMonth,
  args.maxPerMonth,
  args.randomSeed
)
  .catch((err) => {
    console.error("Invoice seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
