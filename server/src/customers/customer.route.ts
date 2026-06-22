import { Router } from "express";
import { authenticate } from "../common/middleware/authenticate.js";
import { businessContext } from "../common/middleware/business-context.js";
import { CustomerController } from "./customer.controller.js";

const router = Router();

router.use(authenticate, businessContext);

router.get("/", CustomerController.list);
router.post("/", CustomerController.create);

export { router as customersRouter };
