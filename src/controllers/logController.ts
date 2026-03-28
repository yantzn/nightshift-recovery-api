import type { APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";

import { shiftService } from "../services/shiftService";
import { BadRequestError } from "../utils/errors";

const createSleepLogSchema = z
  .object({
    logType: z.enum([
      "pre_shift_sleep",
      "pre_shift_nap",
      "during_shift_nap",
      "post_shift_main_sleep",
      "post_shift_recovery_sleep"
    ]),
    startTime: z.string().datetime({ offset: true }),
    endTime: z.string().datetime({ offset: true }),
    sleepinessScore: z.number().int().min(1).max(5),
    fatigueScore: z.number().int().min(1).max(5),
    sleepQualityScore: z.number().int().min(1).max(5).nullable().optional(),
    caffeineIntakeMg: z.number().int().min(0).nullable().optional(),
    interruptionCount: z.number().int().min(0).nullable().optional(),
    recoveryFeelingScore: z.number().int().min(1).max(5).nullable().optional()
  })
  .superRefine((value, ctx) => {
    const start = new Date(value.startTime).getTime();
    const end = new Date(value.endTime).getTime();

    if (!Number.isNaN(start) && !Number.isNaN(end) && start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startTime must be earlier than endTime",
        path: ["startTime"]
      });
    }
  });

const parseJsonBody = (body: string | null): unknown => {
  if (!body) {
    throw new BadRequestError("Request body is required");
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }
};

const jsonResponse = <T>(statusCode: number, body: T): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(body)
  };
};

export class LogController {
  public async createSleepLog(
    shiftId: string,
    body: string | null,
    authenticatedUserId: string
  ): Promise<APIGatewayProxyResult> {
    if (!shiftId) {
      throw new BadRequestError("shiftId is required");
    }

    const parsed = createSleepLogSchema.safeParse(parseJsonBody(body));

    if (!parsed.success) {
      throw new BadRequestError("Sleep log payload validation failed", parsed.error.flatten());
    }

    const log = await shiftService.createSleepLog(shiftId, parsed.data, authenticatedUserId);

    return jsonResponse(201, log);
  }

  public async listSleepLogs(
    shiftId: string,
    authenticatedUserId: string
  ): Promise<APIGatewayProxyResult> {
    if (!shiftId) {
      throw new BadRequestError("shiftId is required");
    }

    const items = await shiftService.listSleepLogs(shiftId, authenticatedUserId);

    return jsonResponse(200, { items });
  }
}

export const logController = new LogController();
