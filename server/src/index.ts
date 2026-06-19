if (process.env["NODE_ENV"] !== "production") {
  await import("dotenv/config");
}
import express from "express";
import { prisma } from "./lib/prisma.js";

const app = express();
const PORT = process.env.PORT || 3000;
console.log(`Using database URL: ${process.env["DATABASE_URL"]}`);
console.log(`Using port: ${PORT}`);

app.use(express.json());

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
