import type { APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";

import { shiftService } from "../services/shiftService";
import { BadRequestError } from "../utils/errors";

const createShiftSchema = z
  .object({
    userId: z.string().min(1),
    shiftDate: z.string().date(),
    startTime: z.string().datetime({ offset: true }),
    endTime: z.string().datetime({ offset: true }),
    napWindowStart: z.string().datetime({ offset: true }),
    napWindowEnd: z.string().datetime({ offset: true }),
    maxNapMinutes: z.number().int().min(0).max(180)
  })
  .superRefine((value, ctx) => {
    const start = new Date(value.startTime).getTime();
    const end = new Date(value.endTime).getTime();
    const napStart = new Date(value.napWindowStart).getTime();
    const napEnd = new Date(value.napWindowEnd).getTime();

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      Number.isNaN(napStart) ||
      Number.isNaN(napEnd)
    ) {
      return;
    }

    if (start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startTime must be earlier than endTime",
        path: ["startTime"]
      });
    }

    if (napStart >= napEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "napWindowStart must be earlier than napWindowEnd",
        path: ["napWindowStart"]
      });
    }
  });

const listShiftsQuerySchema = z.object({
  userId: z.string().min(1)
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

export class ShiftController {
  public async createShift(
    body: string | null,
    authenticatedUserId: string
  ): Promise<APIGatewayProxyResult> {
    const parsed = createShiftSchema.safeParse(parseJsonBody(body));

    if (!parsed.success) {
      throw new BadRequestError("Shift payload validation failed", parsed.error.flatten());
    }

    const shift = await shiftService.createShift(parsed.data, authenticatedUserId);

    return jsonResponse(201, shift);
  }

  public async listShifts(
    queryStringParameters: Record<string, string | undefined> | null | undefined,
    authenticatedUserId: string
  ): Promise<APIGatewayProxyResult> {
    const parsed = listShiftsQuerySchema.safeParse({
      userId: queryStringParameters?.userId
    });

    if (!parsed.success) {
      throw new BadRequestError("Query validation failed", parsed.error.flatten());
    }

    const items = await shiftService.listShifts(parsed.data.userId, authenticatedUserId);

    return jsonResponse(200, { items });
  }

  public async getShift(
    shiftId: string,
    authenticatedUserId: string
  ): Promise<APIGatewayProxyResult> {
    if (!shiftId) {
      throw new BadRequestError("shiftId is required");
    }

    const shift = await shiftService.getShift(shiftId, authenticatedUserId);

    return jsonResponse(200, shift);
  }
}

export const shiftController = new ShiftController();
