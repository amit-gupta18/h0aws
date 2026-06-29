import { Router } from "express";
import { authenticate } from "../common/middleware/authenticate.js";
import { businessContext } from "../common/middleware/business-context.js";
import { requireRole } from "../common/middleware/require-role.js";
import { ExpenseController } from "./expense.controller.js";

const router = Router();

router.use(authenticate, businessContext);

router.get("/", ExpenseController.list);
router.post("/", requireRole("OWNER", "ACCOUNTANT"), ExpenseController.create);
router.put("/:id", requireRole("OWNER", "ACCOUNTANT"), ExpenseController.update);
router.delete("/:id", requireRole("OWNER", "ACCOUNTANT"), ExpenseController.delete);

export { router as expensesRouter };
