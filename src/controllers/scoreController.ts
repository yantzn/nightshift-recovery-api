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

export class ScoreController {
  public async getRecoveryScore(
    shiftId: string,
    authenticatedUserId: string
  ): Promise<APIGatewayProxyResult> {
    if (!shiftId) {
      throw new BadRequestError("shiftId is required");
    }

    const result = await shiftService.getRecoveryScore(shiftId, authenticatedUserId);

    return jsonResponse(200, result);
  }
}

export const scoreController = new ScoreController();
