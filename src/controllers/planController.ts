import type { APIGatewayProxyResult } from "aws-lambda";

import { shiftService } from "../services/shiftService";
import { BadRequestError } from "../utils/errors";

const jsonResponse = <T>(statusCode: number, body: T): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(body)
  };
};

export class PlanController {
  public async getPlan(
    shiftId: string,
    authenticatedUserId: string
  ): Promise<APIGatewayProxyResult> {
    if (!shiftId) {
      throw new BadRequestError("shiftId is required");
    }

    const result = await shiftService.getPlan(shiftId, authenticatedUserId);

    return jsonResponse(200, result);
  }
}

export const planController = new PlanController();
