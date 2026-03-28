import type { PlanItem, PlanResponse, Shift } from "../models/types";

const MINUTES_PER_HOUR = 60;

const toDate = (value: string): Date => new Date(value);

const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60 * 1000);
};

const subtractMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() - minutes * 60 * 1000);
};

const toIsoString = (date: Date): string => date.toISOString();

const diffMinutes = (start: Date, end: Date): number => {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (60 * 1000)));
};

const clampMinutes = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const buildPlanItem = (phase: string, start: Date, end: Date, reason: string): PlanItem => {
  return {
    phase,
    start: toIsoString(start),
    end: toIsoString(end),
    durationMinutes: diffMinutes(start, end),
    reason
  };
};

const buildWithinWindowNap = (
  phase: string,
  windowStart: Date,
  windowEnd: Date,
  desiredMinutes: number,
  reason: string
): PlanItem | null => {
  const windowDuration = diffMinutes(windowStart, windowEnd);

  if (windowDuration <= 0) {
    return null;
  }

  const actualMinutes = clampMinutes(desiredMinutes, 30, windowDuration);
  const napEnd = addMinutes(windowStart, actualMinutes);

  return buildPlanItem(phase, windowStart, napEnd, reason);
};

const buildPreShiftNap = (shift: Shift): PlanItem | null => {
  const startTime = toDate(shift.startTime);
  const desiredEnd = subtractMinutes(startTime, 30);
  const desiredStart = subtractMinutes(desiredEnd, 90);

  if (desiredStart >= desiredEnd) {
    return null;
  }

  return buildPlanItem(
    "pre_shift_nap",
    desiredStart,
    desiredEnd,
    "夜勤前に90分程度の計画的仮眠を確保し、勤務中の眠気と疲労の軽減を狙います。"
  );
};

const buildCoreNap = (shift: Shift): PlanItem | null => {
  const napWindowStart = toDate(shift.napWindowStart);
  const napWindowEnd = toDate(shift.napWindowEnd);
  const desiredMinutes = Math.min(90, shift.maxNapMinutes);

  return buildWithinWindowNap(
    "during_shift_core_nap",
    napWindowStart,
    napWindowEnd,
    desiredMinutes,
    "16時間夜勤では勤務中にまとまった仮眠機会を確保することで、眠気と疲労の蓄積を抑えます。"
  );
};

const buildSplitNap = (shift: Shift): PlanItem[] => {
  const napWindowStart = toDate(shift.napWindowStart);
  const napWindowEnd = toDate(shift.napWindowEnd);
  const availableMinutes = diffMinutes(napWindowStart, napWindowEnd);

  if (availableMinutes < 60) {
    return [];
  }

  const totalNapMinutes = Math.min(shift.maxNapMinutes, 60);
  const firstNapMinutes = Math.floor(totalNapMinutes / 2);
  const secondNapMinutes = totalNapMinutes - firstNapMinutes;

  const midpoint = new Date(
    napWindowStart.getTime() + (napWindowEnd.getTime() - napWindowStart.getTime()) / 2
  );

  const firstNapStart = napWindowStart;
  const firstNapEnd = addMinutes(firstNapStart, firstNapMinutes);

  const secondNapEnd = napWindowEnd;
  const secondNapStart = subtractMinutes(secondNapEnd, secondNapMinutes);

  if (firstNapEnd > midpoint || secondNapStart < midpoint) {
    return [
      buildPlanItem(
        "during_shift_split_nap_1",
        firstNapStart,
        firstNapEnd,
        "まとまった仮眠が難しい場合の代替案として短時間仮眠を確保します。"
      ),
      buildPlanItem(
        "during_shift_split_nap_2",
        secondNapStart,
        secondNapEnd,
        "勤務後半の眠気対策として短時間仮眠を追加します。"
      )
    ];
  }

  return [
    buildPlanItem(
      "during_shift_split_nap_1",
      firstNapStart,
      firstNapEnd,
      "まとまった仮眠が難しい場合の代替案として短時間仮眠を確保します。"
    ),
    buildPlanItem(
      "during_shift_split_nap_2",
      secondNapStart,
      secondNapEnd,
      "勤務後半の眠気対策として短時間仮眠を追加します。"
    )
  ];
};

const buildPostShiftRecoverySleep = (shift: Shift): PlanItem => {
  const endTime = toDate(shift.endTime);
  const start = addMinutes(endTime, 60);
  const end = addMinutes(start, 240);

  return buildPlanItem(
    "post_shift_main_sleep",
    start,
    end,
    "夜勤明けは早めに主睡眠を取り、回復のベースとなる睡眠時間を確保します。"
  );
};

const buildFallbackPlan = (shift: Shift): PlanItem[] => {
  const endTime = toDate(shift.endTime);
  const fallbackRecoveryStart = addMinutes(endTime, 90);
  const fallbackRecoveryEnd = addMinutes(fallbackRecoveryStart, 180);

  return [
    buildPlanItem(
      "post_shift_recovery_sleep",
      fallbackRecoveryStart,
      fallbackRecoveryEnd,
      "勤務中仮眠が確保しにくい場合でも、夜勤明けの回復睡眠を優先してください。"
    )
  ];
};

export class PlanService {
  public generatePlan(shift: Shift): PlanResponse {
    const recommendedPlan: PlanItem[] = [];
    const alternativePlans: PlanItem[] = [];

    const preShiftNap = buildPreShiftNap(shift);
    if (preShiftNap) {
      recommendedPlan.push(preShiftNap);
    }

    const coreNap = buildCoreNap(shift);
    if (coreNap) {
      recommendedPlan.push(coreNap);
    }

    recommendedPlan.push(buildPostShiftRecoverySleep(shift));

    const splitNapPlans = buildSplitNap(shift);
    alternativePlans.push(...splitNapPlans);

    if (!coreNap && splitNapPlans.length === 0) {
      alternativePlans.push(...buildFallbackPlan(shift));
    } else {
      alternativePlans.push(...buildFallbackPlan(shift));
    }

    return {
      shiftId: shift.shiftId,
      recommendedPlan,
      alternativePlans
    };
  }
}

export const planService = new PlanService();
