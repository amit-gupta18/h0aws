import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { prisma } from "./lib/prisma.js";
import { authRouter } from "./auth/auth.route.js";
import { businessRouter } from "./business/business.route.js";
import { invoicesRouter } from "./invoices/invoice.route.js";
import { customersRouter } from "./customers/customer.route.js";
import { productsRouter } from "./products/product.route.js";
import { membersRouter } from "./members/member.route.js";

const app = express();
const PORT = process.env["PORT"] ?? 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/businesses", businessRouter);
app.use("/api/v1/invoices", invoicesRouter);
app.use("/api/v1/customers", customersRouter);
app.use("/api/v1/products", productsRouter);
app.use("/api/v1/members", membersRouter);

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
