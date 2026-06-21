import type { AuthPayload } from "../common/middleware/authenticate.js";
import type { BusinessContext } from "../common/middleware/business-context.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      context?: BusinessContext;
    }
  }
}
