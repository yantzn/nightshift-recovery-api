import type { APIGatewayProxyResult } from "aws-lambda";
import type { Logger } from "pino";

import { logError } from "./logger";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    errorCode = "INTERNAL_SERVER_ERROR",
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Request validation failed", details?: unknown) {
    super(message, 400, "BAD_REQUEST", details);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Missing or invalid authentication token", details?: unknown) {
    super(message, 401, "UNAUTHORIZED", details);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You are not allowed to access this resource", details?: unknown) {
    super(message, 403, "FORBIDDEN", details);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Requested resource was not found", details?: unknown) {
    super(message, 404, "NOT_FOUND", details);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists", details?: unknown) {
    super(message, 409, "CONFLICT", details);
    this.name = "ConflictError";
  }
}

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

export const normalizeUnknownError = (error: unknown): AppError => {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError("An unexpected error occurred", 500, "INTERNAL_SERVER_ERROR", {
      originalName: error.name
    });
  }

  return new AppError("An unexpected error occurred");
};

export const buildErrorResponse = (error: AppError): APIGatewayProxyResult => {
  return {
    statusCode: error.statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      error: {
        code: error.errorCode,
        message: error.message
      }
    })
  };
};

export const logHandledError = (
  logger: Logger,
  error: unknown,
  eventName = "request.failed"
): APIGatewayProxyResult => {
  const normalized = normalizeUnknownError(error);

  logError(logger, {
    event: eventName,
    msg: normalized.message,
    errorCode: normalized.errorCode,
    statusCode: normalized.statusCode,
    details: normalized.details,
    err: normalized
  });

  return buildErrorResponse(normalized);
};
