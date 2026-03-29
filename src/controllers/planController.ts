import type { PlanResponse } from "../models/types";
import { shiftService } from "../services/shiftService";
import { BadRequestError } from "../utils/errors";

export class PlanController {
  public async getPlan(shiftId: string, authenticatedUserId: string): Promise<PlanResponse> {
    if (!shiftId) {
      throw new BadRequestError("shiftId is required");
    }

    return shiftService.getPlan(shiftId, authenticatedUserId);
  }
}

export const planController = new PlanController();
