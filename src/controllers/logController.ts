import { z } from "zod";

import type { CreateSleepLogInput, SleepLog } from "../models/types";
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
    startTime: z.iso.datetime({ offset: true }),
    endTime: z.iso.datetime({ offset: true }),
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
        code: "custom",
        message: "startTime must be earlier than endTime",
        path: ["startTime"]
      });
    }
  });

const parseJsonBody = (body: string | null | undefined): unknown => {
  if (!body) {
    throw new BadRequestError("Request body is required");
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }
};

export class LogController {
  public async createSleepLog(
    shiftId: string,
    body: string | null | undefined,
    authenticatedUserId: string
  ): Promise<SleepLog> {
    if (!shiftId) {
      throw new BadRequestError("shiftId is required");
    }

    const parsed = createSleepLogSchema.safeParse(parseJsonBody(body));

    if (!parsed.success) {
      throw new BadRequestError(
        "Sleep log payload validation failed",
        z.treeifyError(parsed.error)
      );
    }

    return shiftService.createSleepLog(
      shiftId,
      parsed.data as CreateSleepLogInput,
      authenticatedUserId
    );
  }

  public async listSleepLogs(
    shiftId: string,
    authenticatedUserId: string
  ): Promise<{ items: SleepLog[] }> {
    if (!shiftId) {
      throw new BadRequestError("shiftId is required");
    }

    const items = await shiftService.listSleepLogs(shiftId, authenticatedUserId);

    return { items };
  }
}

export const logController = new LogController();
