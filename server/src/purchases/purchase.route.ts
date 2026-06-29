import { Router } from "express";
import { authenticate } from "../common/middleware/authenticate.js";
import { businessContext } from "../common/middleware/business-context.js";
import { requireRole } from "../common/middleware/require-role.js";
import { PurchaseController } from "./purchase.controller.js";

const router = Router();

router.use(authenticate, businessContext);

router.get("/", requireRole("OWNER", "ACCOUNTANT"), PurchaseController.list);
router.post("/", requireRole("OWNER", "ACCOUNTANT"), PurchaseController.create);
router.put("/:id", requireRole("OWNER", "ACCOUNTANT"), PurchaseController.update);
router.delete("/:id", requireRole("OWNER", "ACCOUNTANT"), PurchaseController.delete);

export { router as purchasesRouter };
