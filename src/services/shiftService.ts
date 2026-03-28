import type {
  CreateShiftInput,
  CreateSleepLogInput,
  PlanResponse,
  RecoveryScore,
  Shift,
  SleepLog
} from "../models/types";
import { shiftRepository } from "../repositories/shiftRepository";
import { sleepLogRepository } from "../repositories/sleepLogRepository";
import { assertUserCanAccessResource } from "../utils/auth";
import { NotFoundError } from "../utils/errors";
import { planService } from "./planService";
import { scoreService } from "./scoreService";

export class ShiftService {
  public async createShift(input: CreateShiftInput, authenticatedUserId: string): Promise<Shift> {
    assertUserCanAccessResource(authenticatedUserId, input.userId);
    return shiftRepository.createIfNotDuplicate(input);
  }

  public async listShifts(userId: string, authenticatedUserId: string): Promise<Shift[]> {
    assertUserCanAccessResource(authenticatedUserId, userId);
    return shiftRepository.listByUserId(userId);
  }

  public async getShift(shiftId: string, authenticatedUserId: string): Promise<Shift> {
    return shiftRepository.getById(shiftId, authenticatedUserId);
  }

  public async createSleepLog(
    shiftId: string,
    input: CreateSleepLogInput,
    authenticatedUserId: string
  ): Promise<SleepLog> {
    const shift = await shiftRepository.getById(shiftId, authenticatedUserId);

    if (!shift) {
      throw new NotFoundError("Shift was not found");
    }

    assertUserCanAccessResource(authenticatedUserId, shift.userId);

    return sleepLogRepository.create(shiftId, authenticatedUserId, input);
  }

  public async listSleepLogs(shiftId: string, authenticatedUserId: string): Promise<SleepLog[]> {
    const shift = await shiftRepository.getById(shiftId, authenticatedUserId);
    assertUserCanAccessResource(authenticatedUserId, shift.userId);

    return sleepLogRepository.listByShiftId(shiftId);
  }

  public async getPlan(shiftId: string, authenticatedUserId: string): Promise<PlanResponse> {
    const shift = await shiftRepository.getById(shiftId, authenticatedUserId);
    assertUserCanAccessResource(authenticatedUserId, shift.userId);

    return planService.generatePlan(shift);
  }

  public async getRecoveryScore(
    shiftId: string,
    authenticatedUserId: string
  ): Promise<RecoveryScore> {
    const shift = await shiftRepository.getById(shiftId, authenticatedUserId);
    assertUserCanAccessResource(authenticatedUserId, shift.userId);

    const logs = await sleepLogRepository.listByShiftId(shiftId);

    return scoreService.calculate(shift, logs);
  }
}

export const shiftService = new ShiftService();
