import { Router } from "express";
import { authenticate } from "../common/middleware/authenticate.js";
import { businessContext } from "../common/middleware/business-context.js";
import { requireRole } from "../common/middleware/require-role.js";
import { MemberController } from "./member.controller.js";

const router = Router();

// Team management is owner-only and always scoped to the active business.
router.use(authenticate, businessContext, requireRole("OWNER"));

router.get("/", MemberController.list);
router.post("/", MemberController.add);
router.delete("/:id", MemberController.remove);

export { router as membersRouter };
