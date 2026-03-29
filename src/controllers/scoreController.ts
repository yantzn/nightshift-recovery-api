import type { RecoveryScore } from "../models/types";
import { shiftService } from "../services/shiftService";
import { BadRequestError } from "../utils/errors";

export class ScoreController {
  public async getRecoveryScore(
    shiftId: string,
    authenticatedUserId: string
  ): Promise<RecoveryScore> {
    if (!shiftId) {
      throw new BadRequestError("shiftId is required");
    }

    return shiftService.getRecoveryScore(shiftId, authenticatedUserId);
  }
}

export const scoreController = new ScoreController();
