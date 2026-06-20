import type { AuthPayload } from "../middleware/authenticate.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
