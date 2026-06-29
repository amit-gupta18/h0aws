import { Router } from "express";
import { authenticate } from "../common/middleware/authenticate.js";
import { businessContext } from "../common/middleware/business-context.js";
import { requireRole } from "../common/middleware/require-role.js";
import { InventoryController } from "./inventory.controller.js";

const router = Router();

router.use(authenticate, businessContext);

router.get("/transactions", InventoryController.listTransactions);
router.post(
  "/adjustments",
  requireRole("OWNER", "ACCOUNTANT"),
  InventoryController.adjust
);

export { router as inventoryRouter };
