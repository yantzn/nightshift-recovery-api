import type { AuthContext } from "../models/types";

export interface RequestContext {
  requestId: string;
  traceId?: string;
  correlationId: string;
  route?: string;
  method?: string;
  shiftId?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      requestContext?: RequestContext;
    }
  }
}

export {};
