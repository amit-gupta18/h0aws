import { Router } from "express";
import { authenticate } from "../common/middleware/authenticate.js";
import { businessContext } from "../common/middleware/business-context.js";
import { requireRole } from "../common/middleware/require-role.js";
import { InsightsController } from "./insights.controller.js";

const router = Router();

router.use(authenticate, businessContext);

router.get("/summary", requireRole("OWNER"), InsightsController.summary);

export { router as insightsRouter };
