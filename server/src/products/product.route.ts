import { Router } from "express";
import { authenticate } from "../common/middleware/authenticate.js";
import { businessContext } from "../common/middleware/business-context.js";
import { ProductController } from "./product.controller.js";

const router = Router();

router.use(authenticate, businessContext);

router.get("/", ProductController.list);
router.post("/", ProductController.create);

export { router as productsRouter };
