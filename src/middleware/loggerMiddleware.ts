import type { NextFunction, Request, Response } from "express";

import { createRequestLogger, logError, logInfo } from "../utils/logger";

const extractShiftId = (req: Request): string | undefined => {
  const value = req.params.shiftId;

  return typeof value === "string" && value.length > 0 ? value : undefined;
};

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startedAt = Date.now();
  const requestContext = req.requestContext;

  const logger = createRequestLogger({
    requestId: requestContext?.requestId ?? "unknown-request-id",
    traceId: requestContext?.traceId,
    correlationId: requestContext?.correlationId ?? "unknown-correlation-id",
    route: req.path,
    method: req.method,
    userIdMasked: req.auth?.userId,
    shiftId: extractShiftId(req)
  });

  res.locals.logger = logger;

  logInfo(logger, {
    event: "http.request.started",
    msg: "HTTP request started",
    route: req.path,
    method: req.method,
    shiftId: extractShiftId(req)
  });

  res.on("finish", () => {
    logInfo(logger, {
      event: "http.request.completed",
      msg: "HTTP request completed",
      route: req.path,
      method: req.method,
      shiftId: extractShiftId(req),
      statusCode: res.statusCode,
      latencyMs: Date.now() - startedAt
    });
  });

  res.on("error", (error) => {
    logError(logger, {
      event: "http.response.error",
      msg: "HTTP response stream error",
      route: req.path,
      method: req.method,
      shiftId: extractShiftId(req),
      err: error
    });
  });

  next();
};
