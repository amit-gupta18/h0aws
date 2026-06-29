import { Router } from "express";
import { authenticate } from "../common/middleware/authenticate.js";
import { businessContext } from "../common/middleware/business-context.js";
import { requireRole } from "../common/middleware/require-role.js";
import { InvoiceController } from "./invoice.controller.js";

const router = Router();

router.use(authenticate, businessContext);

router.post("/", requireRole("OWNER", "ACCOUNTANT"), InvoiceController.create);
router.get("/", InvoiceController.list);
router.get("/:id", InvoiceController.getById);
router.get("/:id/pdf", InvoiceController.getPdf);
router.put("/:id", requireRole("OWNER", "ACCOUNTANT"), InvoiceController.update);
router.patch("/:id/cancel", requireRole("OWNER", "ACCOUNTANT"), InvoiceController.cancel);

export { router as invoicesRouter };
