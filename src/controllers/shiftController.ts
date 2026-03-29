import { z } from "zod";

import type { CreateShiftInput, Shift } from "../models/types";
import { shiftService } from "../services/shiftService";
import { BadRequestError } from "../utils/errors";

const createShiftSchema = z
  .object({
    userId: z.string().min(1),
    shiftDate: z.iso.date(),
    startTime: z.iso.datetime({ offset: true }),
    endTime: z.iso.datetime({ offset: true }),
    napWindowStart: z.iso.datetime({ offset: true }),
    napWindowEnd: z.iso.datetime({ offset: true }),
    maxNapMinutes: z.number().int().min(0).max(180)
  })
  .superRefine((value, ctx) => {
    const start = new Date(value.startTime).getTime();
    const end = new Date(value.endTime).getTime();
    const napStart = new Date(value.napWindowStart).getTime();
    const napEnd = new Date(value.napWindowEnd).getTime();

    if (!Number.isNaN(start) && !Number.isNaN(end) && start >= end) {
      ctx.addIssue({
        code: "custom",
        message: "startTime must be earlier than endTime",
        path: ["startTime"]
      });
    }

    if (!Number.isNaN(napStart) && !Number.isNaN(napEnd) && napStart >= napEnd) {
      ctx.addIssue({
        code: "custom",
        message: "napWindowStart must be earlier than napWindowEnd",
        path: ["napWindowStart"]
      });
    }
  });

const listShiftsQuerySchema = z.object({
  userId: z.string().min(1)
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

export class ShiftController {
  public async createShift(
    body: string | null | undefined,
    authenticatedUserId: string
  ): Promise<Shift> {
    const parsed = createShiftSchema.safeParse(parseJsonBody(body));

    if (!parsed.success) {
      throw new BadRequestError("Shift payload validation failed", z.treeifyError(parsed.error));
    }

    return shiftService.createShift(parsed.data as CreateShiftInput, authenticatedUserId);
  }

  public async listShifts(
    queryStringParameters: Record<string, string | undefined> | null | undefined,
    authenticatedUserId: string
  ): Promise<{ items: Shift[] }> {
    const parsed = listShiftsQuerySchema.safeParse({
      userId: queryStringParameters?.userId
    });

    if (!parsed.success) {
      throw new BadRequestError("Query validation failed", z.treeifyError(parsed.error));
    }

    const items = await shiftService.listShifts(parsed.data.userId, authenticatedUserId);

    return { items };
  }

  public async getShift(shiftId: string, authenticatedUserId: string): Promise<Shift> {
    if (!shiftId) {
      throw new BadRequestError("shiftId is required");
    }

    return shiftService.getShift(shiftId, authenticatedUserId);
  }
}

export const shiftController = new ShiftController();
