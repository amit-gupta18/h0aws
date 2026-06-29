import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { authenticate } from "../common/middleware/authenticate.js";
import { businessContext } from "../common/middleware/business-context.js";
import { requireRole } from "../common/middleware/require-role.js";
import { GstController } from "./gst.controller.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(null, ok);
  },
});

const ocrLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many OCR requests. Try again later." },
});

router.use(authenticate, businessContext, requireRole("OWNER"));

router.get("/summary", GstController.summary);
router.get("/export", GstController.exportCsv);
router.get("/advisory/composition", GstController.compositionAdvisory);
router.get("/reconciliation/demo", GstController.reconciliationDemo);
router.get("/itr-package", GstController.itrPackage);
router.post(
  "/purchase/ocr",
  ocrLimiter,
  upload.single("image"),
  GstController.purchaseOcr
);

export { router as gstRouter };
