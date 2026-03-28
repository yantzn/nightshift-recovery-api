import type { NextFunction, Request, Response } from "express";
import type { Logger } from "pino";

import { buildErrorResponse, normalizeUnknownError } from "../utils/errors";
import { logError, rootLogger } from "../utils/logger";

const getLogger = (res: Response): Logger => {
  return (res.locals.logger as Logger | undefined) ?? rootLogger;
};

export const errorMiddleware = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const logger = getLogger(res);
  const normalized = normalizeUnknownError(error);

  logError(logger, {
    event: "http.request.failed",
    msg: normalized.message,
    errorCode: normalized.errorCode,
    statusCode: normalized.statusCode,
    route: req.path,
    method: req.method,
    shiftId: typeof req.params.shiftId === "string" ? req.params.shiftId : undefined,
    details: normalized.details,
    err: normalized
  });

  const response = buildErrorResponse(normalized);

  res
    .status(response.statusCode)
    .set("Content-Type", "application/json; charset=utf-8")
    .send(response.body);
};
