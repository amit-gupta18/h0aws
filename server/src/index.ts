import express from "express";
import { prisma } from "./lib/prisma.js";

const app = express();
const PORT = process.env["PORT"] ?? 3001;

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
