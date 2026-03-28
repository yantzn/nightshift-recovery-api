export type IsoDateString = string;
export type IsoDateTimeString = string;

export type ShiftId = string;
export type UserId = string;
export type LogId = string;
export type ScoreId = string;

export type SleepLogType =
  | "pre_shift_sleep"
  | "pre_shift_nap"
  | "during_shift_nap"
  | "post_shift_main_sleep"
  | "post_shift_recovery_sleep";

export interface Shift {
  shiftId: ShiftId;
  userId: UserId;
  shiftDate: IsoDateString;
  startTime: IsoDateTimeString;
  endTime: IsoDateTimeString;
  napWindowStart: IsoDateTimeString;
  napWindowEnd: IsoDateTimeString;
  maxNapMinutes: number;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface CreateShiftInput {
  userId: UserId;
  shiftDate: IsoDateString;
  startTime: IsoDateTimeString;
  endTime: IsoDateTimeString;
  napWindowStart: IsoDateTimeString;
  napWindowEnd: IsoDateTimeString;
  maxNapMinutes: number;
}

export interface SleepLog {
  logId: LogId;
  shiftId: ShiftId;
  userId: UserId;
  logType: SleepLogType;
  startTime: IsoDateTimeString;
  endTime: IsoDateTimeString;
  sleepinessScore: number;
  fatigueScore: number;
  sleepQualityScore: number | null;
  caffeineIntakeMg: number | null;
  interruptionCount: number | null;
  recoveryFeelingScore: number | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface CreateSleepLogInput {
  logType: SleepLogType;
  startTime: IsoDateTimeString;
  endTime: IsoDateTimeString;
  sleepinessScore: number;
  fatigueScore: number;
  sleepQualityScore?: number | null;
  caffeineIntakeMg?: number | null;
  interruptionCount?: number | null;
  recoveryFeelingScore?: number | null;
}

export interface PlanItem {
  phase: string;
  start: IsoDateTimeString;
  end: IsoDateTimeString;
  durationMinutes: number;
  reason: string;
}

export interface PlanResponse {
  shiftId: ShiftId;
  recommendedPlan: PlanItem[];
  alternativePlans: PlanItem[];
}

export type DeficiencyLabel =
  | "insufficient_total_sleep"
  | "insufficient_pre_shift_nap"
  | "insufficient_post_shift_recovery"
  | "high_sleepiness"
  | "high_fatigue"
  | "low_sleep_quality"
  | "frequent_interruptions"
  | "late_caffeine"
  | "insufficient_data";

export interface RecoveryScore {
  scoreId: ScoreId;
  shiftId: ShiftId;
  totalSleepMinutes: number;
  recommendedSleepMinutes: number;
  recoveryScore: number;
  isReferenceValue: boolean;
  deficiencyLabels: DeficiencyLabel[];
  improvementSuggestions: string[];
  calculatedAt: IsoDateTimeString;
}

export interface JwtClaims {
  sub: string;
  userId?: string;
  email?: string;
  scope?: string | string[];
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
  [key: string]: unknown;
}

export interface AuthContext {
  userId: UserId;
  claims: JwtClaims;
  rawToken: string;
}

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
  };
}

export interface SuccessResponseBody<T> {
  data: T;
}

export interface RouteMatchResult {
  resource: "health" | "shifts" | "shift" | "plan" | "logs" | "score" | "unknown";
  shiftId?: string;
}

export interface LogAnalysisInput {
  shift: Shift;
  logs: SleepLog[];
}

export interface NullableSleepMetrics {
  totalSleepMinutes: number;
  averageSleepinessScore: number | null;
  averageFatigueScore: number | null;
  averageSleepQualityScore: number | null;
  totalCaffeineIntakeMg: number | null;
  totalInterruptionCount: number | null;
  averageRecoveryFeelingScore: number | null;
  hasMissingOptionalData: boolean;
  hasNoLogs: boolean;
}
