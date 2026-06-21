import { Router } from "express";
import { authenticate } from "../common/middleware/authenticate.js";
import { BusinessController } from "./business.controller.js";

const router = Router();

// All business routes require an authenticated identity.
router.use(authenticate);

router.post("/", BusinessController.create);
router.get("/", BusinessController.list);

export { router as businessRouter };
