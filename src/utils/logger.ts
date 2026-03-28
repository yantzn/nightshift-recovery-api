import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import pino, { type Logger, type LoggerOptions } from "pino";

type Primitive = string | number | boolean | null;
type SafeJson = Primitive | SafeJson[] | { [key: string]: SafeJson };

export interface RequestLogContext {
  requestId: string;
  traceId?: string;
  correlationId: string;
  route?: string;
  method?: string;
  userIdMasked?: string;
  shiftId?: string;
  coldStart?: boolean;
}

export interface LogFields {
  event: string;
  msg: string;
  errorCode?: string;
  statusCode?: number;
  latencyMs?: number;
  shiftId?: string;
  userIdMasked?: string;
  route?: string;
  method?: string;
  requestId?: string;
  traceId?: string;
  correlationId?: string;
  deficiencyLabels?: string[];
  isReferenceValue?: boolean;
  details?: unknown;
  err?: unknown;
  [key: string]: unknown;
}

const MASK_KEYS = new Set([
  "authorization",
  "token",
  "rawToken",
  "password",
  "secret",
  "jwt",
  "email",
  "claims",
  "sleepinessScore",
  "fatigueScore",
  "sleepQualityScore",
  "recoveryFeelingScore",
  "caffeineIntakeMg",
  "interruptionCount"
]);

let coldStart = true;

const level = process.env.LOG_LEVEL ?? "info";
const environment = process.env.ENVIRONMENT ?? "dev";

const loggerOptions: LoggerOptions = {
  level,
  base: {
    service: "nightshift-recovery-api",
    environment
  },
  messageKey: "msg",
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ["authorization", "token", "rawToken", "password", "secret", "jwt", "email", "claims"],
    censor: "***"
  },
  formatters: {
    level(label) {
      return { level: label };
    }
  }
};

const baseLogger = pino(loggerOptions);

const maskString = (value: string): string => {
  if (value.length <= 4) {
    return "***";
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};

const maskUserId = (userId?: string): string | undefined => {
  if (!userId) {
    return undefined;
  }

  return maskString(userId);
};

const safeSerialize = (value: unknown, seen = new WeakSet<object>()): SafeJson => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => safeSerialize(item, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);

    const output: Record<string, SafeJson> = {};

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (MASK_KEYS.has(key)) {
        output[key] = typeof child === "string" ? maskString(child) : "***";
      } else {
        output[key] = safeSerialize(child, seen);
      }
    }

    return output;
  }

  return JSON.stringify(value);
};

const normalizeTraceId = (event?: APIGatewayProxyEvent): string | undefined => {
  const headerTraceId = event?.headers?.["x-amzn-trace-id"] ?? event?.headers?.["X-Amzn-Trace-Id"];

  return headerTraceId ?? process.env._X_AMZN_TRACE_ID;
};

const normalizeCorrelationId = (event?: APIGatewayProxyEvent, context?: Context): string => {
  return (
    event?.headers?.["x-correlation-id"] ??
    event?.headers?.["X-Correlation-Id"] ??
    event?.requestContext?.requestId ??
    context?.awsRequestId ??
    "unknown-correlation-id"
  );
};

export const buildRequestLogContext = (
  event?: APIGatewayProxyEvent,
  context?: Context,
  userId?: string,
  shiftId?: string
): RequestLogContext => {
  const requestId =
    context?.awsRequestId ?? event?.requestContext?.requestId ?? "unknown-request-id";
  const traceId = normalizeTraceId(event);
  const correlationId = normalizeCorrelationId(event, context);

  const requestContext: RequestLogContext = {
    requestId,
    traceId,
    correlationId,
    route: event?.requestContext?.resourcePath ?? event?.path,
    method: event?.httpMethod,
    userIdMasked: maskUserId(userId),
    shiftId,
    coldStart
  };

  coldStart = false;

  return requestContext;
};

export const createRequestLogger = (requestContext: RequestLogContext): Logger => {
  return baseLogger.child({
    request_id: requestContext.requestId,
    trace_id: requestContext.traceId,
    correlation_id: requestContext.correlationId,
    route: requestContext.route,
    method: requestContext.method,
    user_id_masked: requestContext.userIdMasked,
    shift_id: requestContext.shiftId,
    cold_start: requestContext.coldStart
  });
};

const normalizeFields = (fields: LogFields): Record<string, SafeJson> => {
  const normalized: Record<string, SafeJson> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (key === "msg") {
      continue;
    }

    normalized[key] = safeSerialize(value);
  }

  return normalized;
};

export const logInfo = (logger: Logger, fields: LogFields): void => {
  logger.info(normalizeFields(fields), fields.msg);
};

export const logWarn = (logger: Logger, fields: LogFields): void => {
  logger.warn(normalizeFields(fields), fields.msg);
};

export const logError = (logger: Logger, fields: LogFields): void => {
  logger.error(normalizeFields(fields), fields.msg);
};

export const logDebug = (logger: Logger, fields: LogFields): void => {
  logger.debug(normalizeFields(fields), fields.msg);
};

export const rootLogger = baseLogger;
