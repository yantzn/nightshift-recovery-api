import type { NextFunction, Request, Response } from "express";

const normalizeHeaderValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const randomId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const requestContextMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const requestId =
    normalizeHeaderValue(req.header("x-request-id")) ??
    normalizeHeaderValue(req.header("x-amzn-requestid")) ??
    randomId();

  const traceId =
    normalizeHeaderValue(req.header("x-amzn-trace-id")) ?? process.env._X_AMZN_TRACE_ID;

  const correlationId = normalizeHeaderValue(req.header("x-correlation-id")) ?? requestId;

  req.requestContext = {
    requestId,
    traceId,
    correlationId,
    route: req.path,
    method: req.method
  };

  next();
};
