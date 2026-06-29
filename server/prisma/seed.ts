import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { randomUUID } from "crypto";

const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CUSTOMERS = [
  {
    name: "Rajesh Kumar Electronics",
    phone: "9876543210",
    gstin: "27AABCU9603R1ZM",
    stateCode: "27",
    billingAddress: "Shop No. 12, Laxmi Market, Pune 411001",
  },
  {
    name: "Sharma Trading Co.",
    phone: "9123456789",
    gstin: "27AADCS1234P1ZX",
    stateCode: "27",
    billingAddress: "45, Gandhi Road, Mumbai 400001",
  },
  {
    name: "Patel Enterprises",
    phone: "9988776655",
    gstin: "24AABCP5678Q1ZY",
    stateCode: "24",
    billingAddress: "Block C, Industrial Area, Ahmedabad 380015",
  },
  {
    name: "Gupta & Sons",
    phone: "9876123456",
    stateCode: "09",
    billingAddress: "Near Bus Stand, Lucknow 226001",
  },
  {
    name: "Mehta Hardware",
    phone: "9654321098",
    gstin: "27AABCM9012R1ZA",
    stateCode: "27",
    billingAddress: "Main Bazaar, Nagpur 440001",
  },
  {
    name: "Agarwal Distributors",
    phone: "9001234567",
    gstin: "29AABCA3456S1ZB",
    stateCode: "29",
    billingAddress: "MG Road, Bangalore 560001",
  },
  {
    name: "Singh Brothers",
    phone: "9871234560",
    stateCode: "07",
    billingAddress: "Chandni Chowk, Delhi 110006",
  },
  {
    name: "Reddy Traders",
    phone: "9440123456",
    gstin: "36AABCR7890T1ZC",
    stateCode: "36",
    billingAddress: "Begumpet, Hyderabad 500016",
  },
];

const PRODUCTS = [
  { name: "Laptop Stand - Adjustable", sellingPrice: 1499, gstRate: 18, unit: "PCS", hsnCode: "8473", category: "Accessories" },
  { name: "USB-C Hub 7-in-1", sellingPrice: 2499, gstRate: 18, unit: "PCS", hsnCode: "8473", category: "Accessories" },
  { name: "Wireless Mouse", sellingPrice: 899, gstRate: 18, unit: "PCS", hsnCode: "8471", category: "Peripherals" },
  { name: "Mechanical Keyboard", sellingPrice: 3999, gstRate: 18, unit: "PCS", hsnCode: "8471", category: "Peripherals" },
  { name: "Monitor 24 inch FHD", sellingPrice: 12999, gstRate: 18, unit: "PCS", hsnCode: "8528", category: "Displays" },
  { name: "HDMI Cable 2m", sellingPrice: 349, gstRate: 18, unit: "PCS", hsnCode: "8544", category: "Cables" },
  { name: "Webcam HD 1080p", sellingPrice: 2199, gstRate: 18, unit: "PCS", hsnCode: "8525", category: "Peripherals" },
  { name: "Ethernet Cable Cat6 5m", sellingPrice: 199, gstRate: 18, unit: "PCS", hsnCode: "8544", category: "Cables" },
  { name: "Pen Drive 64GB", sellingPrice: 499, gstRate: 18, unit: "PCS", hsnCode: "8523", category: "Storage" },
  { name: "External SSD 500GB", sellingPrice: 4999, gstRate: 18, unit: "PCS", hsnCode: "8471", category: "Storage" },
  { name: "Printer Ink Black", sellingPrice: 799, gstRate: 18, unit: "PCS", hsnCode: "3215", category: "Consumables" },
  { name: "A4 Paper Ream 500 sheets", sellingPrice: 299, gstRate: 12, unit: "PKT", hsnCode: "4802", category: "Consumables" },
  { name: "Surge Protector 4-socket", sellingPrice: 599, gstRate: 18, unit: "PCS", hsnCode: "8536", category: "Electrical" },
  { name: "UPS 600VA", sellingPrice: 3499, gstRate: 18, unit: "PCS", hsnCode: "8504", category: "Electrical" },
  { name: "Laptop Bag 15 inch", sellingPrice: 1299, gstRate: 18, unit: "PCS", hsnCode: "4202", category: "Accessories" },
];

async function seed(businessId: string) {
  console.log(`Seeding data for business: ${businessId}`);

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { members: true },
  });

  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  const owner = business.members.find((m) => m.role === "OWNER");
  if (!owner) {
    throw new Error("No owner found for business");
  }

  console.log(`Found business: ${business.tradeName}`);

  // Ensure business is demo-ready for GST Intelligence
  await prisma.business.update({
    where: { id: businessId },
    data: {
      gstinType: "REGULAR",
      gstin: business.gstin ?? "27AABCU9603R1ZM",
    },
  });

  // Local B2C buyers (same state, no GSTIN) for GSTR-1 B2C split
  const localB2c = [
    { name: "Walk-in Retail", phone: "9812345670" },
    { name: "Local Shop Buyer", phone: "9823456781" },
    { name: "Counter Customer", phone: "9834567892" },
  ];
  for (const c of localB2c) {
    const exists = await prisma.customer.findFirst({
      where: { businessId, name: c.name, deletedAt: null },
    });
    if (!exists) {
      await prisma.customer.create({
        data: {
          businessId,
          name: c.name,
          phone: c.phone,
          stateCode: business.stateCode,
          billingAddress: `Local, state ${business.stateCode}`,
        },
      });
    }
  }

  // Seed customers
  console.log("Creating customers...");
  const customers = await Promise.all(
    CUSTOMERS.map((c) =>
      prisma.customer.create({
        data: {
          ...c,
          businessId,
        },
      })
    )
  );
  console.log(`Created ${customers.length} customers`);

  // Seed products
  console.log("Creating products...");
  const products = await Promise.all(
    PRODUCTS.map((p) =>
      prisma.product.create({
        data: {
          ...p,
          businessId,
        },
      })
    )
  );
  console.log(`Created ${products.length} products`);

  // Ensure invoice sequence exists
  await prisma.invoiceSequence.upsert({
    where: { businessId },
    update: {},
    create: {
      businessId,
      prefix: "INV",
      currentVal: 0,
    },
  });

  // Seed some invoices
  console.log("Creating invoices...");
  const invoicesToCreate = [
    { customerIdx: 0, items: [{ productIdx: 0, qty: 2 }, { productIdx: 2, qty: 3 }], daysAgo: 15, paymentMode: "UPI" as const },
    { customerIdx: 1, items: [{ productIdx: 4, qty: 1 }, { productIdx: 5, qty: 5 }], daysAgo: 12, paymentMode: "CASH" as const },
    { customerIdx: 2, items: [{ productIdx: 9, qty: 2 }, { productIdx: 8, qty: 10 }], daysAgo: 10, paymentMode: "CARD" as const },
    { customerIdx: 3, items: [{ productIdx: 3, qty: 1 }, { productIdx: 6, qty: 2 }], daysAgo: 35, paymentMode: "CREDIT" as const },
    { customerIdx: 4, items: [{ productIdx: 13, qty: 3 }, { productIdx: 12, qty: 5 }], daysAgo: 5, paymentMode: "UPI" as const },
    { customerIdx: 5, items: [{ productIdx: 11, qty: 20 }, { productIdx: 10, qty: 8 }], daysAgo: 3, paymentMode: "CASH" as const },
    { customerIdx: 0, items: [{ productIdx: 1, qty: 4 }, { productIdx: 7, qty: 10 }, { productIdx: 14, qty: 2 }], daysAgo: 2, paymentMode: "UPI" as const },
    { customerIdx: 6, items: [{ productIdx: 4, qty: 2 }], daysAgo: 42, paymentMode: "CREDIT" as const },
  ];

  for (const inv of invoicesToCreate) {
    const customer = customers[inv.customerIdx];
    const isInterState = customer.stateCode !== business.stateCode;
    const transactionType = isInterState ? "INTER_STATE" : "INTRA_STATE";

    const invoiceDate = new Date();
    invoiceDate.setDate(invoiceDate.getDate() - inv.daysAgo);
    const invoiceDateStr = invoiceDate.toISOString().split("T")[0];

    // Calculate totals
    let subtotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const saleItems = inv.items.map((item, idx) => {
      const product = products[item.productIdx];
      const unitPrice = Number(product.sellingPrice);
      const quantity = item.qty;
      const gstRate = Number(product.gstRate);
      const taxableValue = unitPrice * quantity;
      
      subtotal += taxableValue;

      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;

      if (isInterState) {
        igstAmount = (taxableValue * gstRate) / 100;
        igstTotal += igstAmount;
      } else {
        cgstAmount = (taxableValue * gstRate) / 200;
        sgstAmount = (taxableValue * gstRate) / 200;
        cgstTotal += cgstAmount;
        sgstTotal += sgstAmount;
      }

      const lineTotal = taxableValue + cgstAmount + sgstAmount + igstAmount;

      return {
        productId: product.id,
        nameSnapshot: product.name,
        hsnSnapshot: product.hsnCode,
        unitSnapshot: product.unit,
        unitPrice,
        quantity,
        discount: 0,
        gstRate,
        taxableValue,
        cgstAmount,
        sgstAmount,
        igstAmount,
        lineTotal,
        sortOrder: idx,
      };
    });

    const grandTotal = subtotal + cgstTotal + sgstTotal + igstTotal;

    // Get next invoice number
    const seq = await prisma.invoiceSequence.update({
      where: { businessId },
      data: { currentVal: { increment: 1 } },
    });
    const invoiceNumber = `${seq.prefix}-${String(seq.currentVal).padStart(3, "0")}`;

    await prisma.invoice.create({
      data: {
        businessId,
        customerId: customer.id,
        createdById: owner.userId,
        clientBillId: randomUUID(),
        invoiceNumber,
        invoiceDate: new Date(invoiceDateStr),
        documentType: business.gstinType === "COMPOSITION" ? "BILL_OF_SUPPLY" : "TAX_INVOICE",
        transactionType,
        subtotal,
        discount: 0,
        taxableAmount: subtotal,
        cgstTotal,
        sgstTotal,
        igstTotal,
        grandTotal,
        paymentMode: inv.paymentMode,
        status: "ISSUED",
        saleItems: {
          create: saleItems,
        },
      },
    });

    console.log(`Created invoice: ${invoiceNumber}`);
  }

  console.log("\nSeed completed successfully!");
  console.log(`- ${customers.length} customers (+ local B2C, all with phones)`);
  console.log(`- ${products.length} products`);
  console.log(`- ${invoicesToCreate.length} starter invoices (incl. 2 CREDIT / overdue-ready)`);
  console.log("\nNext: npm run seed:demo --", businessId);
  console.log("  → full FY demo for GST Intelligence, Payments, ITR, reconciliation");
}

// Get businessId from command line or environment
const businessId = process.argv[2] || process.env["SEED_BUSINESS_ID"];

if (!businessId) {
  console.error("Usage: npx tsx prisma/seed.ts <businessId>");
  console.error("Or set SEED_BUSINESS_ID environment variable");
  process.exit(1);
}

seed(businessId)
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
