import { randomUUID } from "node:crypto";

import type {
  DeficiencyLabel,
  NullableSleepMetrics,
  RecoveryScore,
  Shift,
  SleepLog
} from "../models/types";

const RECOMMENDED_SLEEP_MINUTES = 510;
const HIGH_SLEEPINESS_THRESHOLD = 4;
const HIGH_FATIGUE_THRESHOLD = 4;
const LOW_SLEEP_QUALITY_THRESHOLD = 2.5;
const HIGH_INTERRUPTION_THRESHOLD = 3;
const LATE_CAFFEINE_THRESHOLD_MG = 150;

const toDate = (value: string): Date => new Date(value);

const diffMinutes = (start: string, end: string): number => {
  const startDate = toDate(start);
  const endDate = toDate(end);

  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / (60 * 1000)));
};

const average = (values: number[]): number | null => {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const sum = (values: number[]): number | null => {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0);
};

const uniqueLabels = (labels: DeficiencyLabel[]): DeficiencyLabel[] => {
  return [...new Set(labels)];
};

const clampScore = (value: number): number => {
  return Math.max(0, Math.min(100, Math.round(value)));
};

const calculateMetrics = (logs: SleepLog[]): NullableSleepMetrics => {
  const totalSleepMinutes = logs.reduce((total, log) => {
    return total + diffMinutes(log.startTime, log.endTime);
  }, 0);

  const sleepinessScores = logs.map((log) => log.sleepinessScore);
  const fatigueScores = logs.map((log) => log.fatigueScore);

  const sleepQualityScores = logs
    .map((log) => log.sleepQualityScore)
    .filter((value): value is number => value !== null);

  const caffeineIntakeMgs = logs
    .map((log) => log.caffeineIntakeMg)
    .filter((value): value is number => value !== null);

  const interruptionCounts = logs
    .map((log) => log.interruptionCount)
    .filter((value): value is number => value !== null);

  const recoveryFeelingScores = logs
    .map((log) => log.recoveryFeelingScore)
    .filter((value): value is number => value !== null);

  const hasMissingOptionalData = logs.some((log) => {
    return (
      log.sleepQualityScore === null ||
      log.caffeineIntakeMg === null ||
      log.interruptionCount === null ||
      log.recoveryFeelingScore === null
    );
  });

  return {
    totalSleepMinutes,
    averageSleepinessScore: average(sleepinessScores),
    averageFatigueScore: average(fatigueScores),
    averageSleepQualityScore: average(sleepQualityScores),
    totalCaffeineIntakeMg: sum(caffeineIntakeMgs),
    totalInterruptionCount: sum(interruptionCounts),
    averageRecoveryFeelingScore: average(recoveryFeelingScores),
    hasMissingOptionalData,
    hasNoLogs: logs.length === 0
  };
};

const buildDeficiencyLabels = (metrics: NullableSleepMetrics, shift: Shift): DeficiencyLabel[] => {
  const labels: DeficiencyLabel[] = [];

  if (metrics.hasNoLogs) {
    labels.push("insufficient_data");
    return labels;
  }

  if (metrics.totalSleepMinutes < RECOMMENDED_SLEEP_MINUTES) {
    labels.push("insufficient_total_sleep");
  }

  const preShiftNapLogs = metrics.hasNoLogs ? 0 : 0;

  if (preShiftNapLogs === 0 && metrics.totalSleepMinutes < RECOMMENDED_SLEEP_MINUTES - 120) {
    labels.push("insufficient_pre_shift_nap");
  }

  const shiftEndTime = toDate(shift.endTime);
  const hasShortTotalSleepForRecovery = metrics.totalSleepMinutes < RECOMMENDED_SLEEP_MINUTES - 180;

  if (hasShortTotalSleepForRecovery && shiftEndTime.getUTCHours() >= 0) {
    labels.push("insufficient_post_shift_recovery");
  }

  if (
    metrics.averageSleepinessScore !== null &&
    metrics.averageSleepinessScore >= HIGH_SLEEPINESS_THRESHOLD
  ) {
    labels.push("high_sleepiness");
  }

  if (
    metrics.averageFatigueScore !== null &&
    metrics.averageFatigueScore >= HIGH_FATIGUE_THRESHOLD
  ) {
    labels.push("high_fatigue");
  }

  if (
    metrics.averageSleepQualityScore !== null &&
    metrics.averageSleepQualityScore <= LOW_SLEEP_QUALITY_THRESHOLD
  ) {
    labels.push("low_sleep_quality");
  }

  if (
    metrics.totalInterruptionCount !== null &&
    metrics.totalInterruptionCount >= HIGH_INTERRUPTION_THRESHOLD
  ) {
    labels.push("frequent_interruptions");
  }

  if (
    metrics.totalCaffeineIntakeMg !== null &&
    metrics.totalCaffeineIntakeMg >= LATE_CAFFEINE_THRESHOLD_MG
  ) {
    labels.push("late_caffeine");
  }

  return uniqueLabels(labels);
};

const buildImprovementSuggestions = (
  labels: DeficiencyLabel[],
  isReferenceValue: boolean
): string[] => {
  const suggestions: string[] = [];

  if (isReferenceValue) {
    suggestions.push(
      "ログ入力が不足しているため参考値です。入力件数を増やすと分析精度が上がります。"
    );
  }

  for (const label of labels) {
    switch (label) {
      case "insufficient_total_sleep":
        suggestions.push(
          "総睡眠時間が不足しています。夜勤前後の合計睡眠時間を増やす計画を立ててください。"
        );
        break;
      case "insufficient_pre_shift_nap":
        suggestions.push(
          "夜勤前に90分前後の計画的仮眠を確保できるよう勤務前の行動を調整してください。"
        );
        break;
      case "insufficient_post_shift_recovery":
        suggestions.push("夜勤明けはできるだけ早めに主睡眠へ入り、回復時間を確保してください。");
        break;
      case "high_sleepiness":
        suggestions.push(
          "勤務中の眠気が強いです。短時間でも仮眠タイミングを確保し、休憩配置を見直してください。"
        );
        break;
      case "high_fatigue":
        suggestions.push(
          "疲労感が高い状態です。夜勤前後の回復行動と勤務間の休養確保を優先してください。"
        );
        break;
      case "low_sleep_quality":
        suggestions.push("睡眠の質が低めです。睡眠前の刺激や光環境、寝室環境を見直してください。");
        break;
      case "frequent_interruptions":
        suggestions.push(
          "睡眠中断が多いです。仮眠・主睡眠を中断しにくい環境づくりを検討してください。"
        );
        break;
      case "late_caffeine":
        suggestions.push(
          "カフェイン摂取量または摂取タイミングを見直し、睡眠前の摂取を避けてください。"
        );
        break;
      case "insufficient_data":
        suggestions.push(
          "睡眠実績ログが未入力です。時刻・眠気・疲労だけでも記録すると評価が改善します。"
        );
        break;
      default:
        break;
    }
  }

  return [...new Set(suggestions)];
};

const calculateBaseScore = (metrics: NullableSleepMetrics): number => {
  if (metrics.hasNoLogs) {
    return 50;
  }

  let score = 100;

  const sleepDeficit = Math.max(0, RECOMMENDED_SLEEP_MINUTES - metrics.totalSleepMinutes);
  score -= Math.min(40, Math.round(sleepDeficit / 15));

  if (metrics.averageSleepinessScore !== null) {
    score -= Math.max(0, Math.round((metrics.averageSleepinessScore - 1) * 6));
  }

  if (metrics.averageFatigueScore !== null) {
    score -= Math.max(0, Math.round((metrics.averageFatigueScore - 1) * 6));
  }

  if (metrics.averageSleepQualityScore !== null) {
    score += Math.round((metrics.averageSleepQualityScore - 3) * 4);
  }

  if (metrics.totalInterruptionCount !== null) {
    score -= Math.min(12, metrics.totalInterruptionCount * 2);
  }

  if (metrics.averageRecoveryFeelingScore !== null) {
    score += Math.round((metrics.averageRecoveryFeelingScore - 3) * 4);
  }

  return clampScore(score);
};

export class ScoreService {
  public calculate(shift: Shift, logs: SleepLog[]): RecoveryScore {
    const metrics = calculateMetrics(logs);

    const isReferenceValue = metrics.hasNoLogs || metrics.hasMissingOptionalData;

    const deficiencyLabels = buildDeficiencyLabels(metrics, shift);
    const improvementSuggestions = buildImprovementSuggestions(deficiencyLabels, isReferenceValue);
    const recoveryScore = calculateBaseScore(metrics);

    return {
      scoreId: randomUUID(),
      shiftId: shift.shiftId,
      totalSleepMinutes: metrics.totalSleepMinutes,
      recommendedSleepMinutes: RECOMMENDED_SLEEP_MINUTES,
      recoveryScore,
      isReferenceValue,
      deficiencyLabels,
      improvementSuggestions,
      calculatedAt: new Date().toISOString()
    };
  }
}

export const scoreService = new ScoreService();
