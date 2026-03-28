import { randomUUID } from "node:crypto";

import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import type { CreateSleepLogInput, SleepLog } from "../models/types";
import { NotFoundError } from "../utils/errors";
import { appTableName, dynamoDocumentClient } from "./dynamodbClient";

const ENTITY_TYPE_SLEEP_LOG = "SLEEP_LOG";

interface SleepLogItem {
  PK: string;
  SK: string;
  entityType: typeof ENTITY_TYPE_SLEEP_LOG;
  GSI1PK: string;
  GSI1SK: string;
  logId: string;
  shiftId: string;
  userId: string;
  logType: SleepLog["logType"];
  startTime: string;
  endTime: string;
  sleepinessScore: number;
  fatigueScore: number;
  sleepQualityScore: number | null;
  caffeineIntakeMg: number | null;
  interruptionCount: number | null;
  recoveryFeelingScore: number | null;
  createdAt: string;
  updatedAt: string;
}

const buildLogPk = (shiftId: string): string => `SHIFT#${shiftId}`;
const buildLogSk = (logId: string): string => `LOG#${logId}`;

const toSleepLogItem = (input: SleepLog): SleepLogItem => {
  return {
    PK: buildLogPk(input.shiftId),
    SK: buildLogSk(input.logId),
    entityType: ENTITY_TYPE_SLEEP_LOG,
    GSI1PK: `USER#${input.userId}`,
    GSI1SK: `SHIFT#${input.shiftId}#LOG#${input.startTime}#${input.logId}`,
    logId: input.logId,
    shiftId: input.shiftId,
    userId: input.userId,
    logType: input.logType,
    startTime: input.startTime,
    endTime: input.endTime,
    sleepinessScore: input.sleepinessScore,
    fatigueScore: input.fatigueScore,
    sleepQualityScore: input.sleepQualityScore,
    caffeineIntakeMg: input.caffeineIntakeMg,
    interruptionCount: input.interruptionCount,
    recoveryFeelingScore: input.recoveryFeelingScore,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  };
};

const toSleepLogModel = (item: SleepLogItem): SleepLog => {
  return {
    logId: item.logId,
    shiftId: item.shiftId,
    userId: item.userId,
    logType: item.logType,
    startTime: item.startTime,
    endTime: item.endTime,
    sleepinessScore: item.sleepinessScore,
    fatigueScore: item.fatigueScore,
    sleepQualityScore: item.sleepQualityScore,
    caffeineIntakeMg: item.caffeineIntakeMg,
    interruptionCount: item.interruptionCount,
    recoveryFeelingScore: item.recoveryFeelingScore,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

const isSleepLogItem = (value: unknown): value is SleepLogItem => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<SleepLogItem>;

  return (
    item.entityType === ENTITY_TYPE_SLEEP_LOG &&
    typeof item.logId === "string" &&
    typeof item.shiftId === "string" &&
    typeof item.userId === "string" &&
    typeof item.logType === "string" &&
    typeof item.startTime === "string" &&
    typeof item.endTime === "string" &&
    typeof item.sleepinessScore === "number" &&
    typeof item.fatigueScore === "number" &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string"
  );
};

export class SleepLogRepository {
  public async create(
    shiftId: string,
    userId: string,
    input: CreateSleepLogInput
  ): Promise<SleepLog> {
    const now = new Date().toISOString();

    const log: SleepLog = {
      logId: randomUUID(),
      shiftId,
      userId,
      logType: input.logType,
      startTime: input.startTime,
      endTime: input.endTime,
      sleepinessScore: input.sleepinessScore,
      fatigueScore: input.fatigueScore,
      sleepQualityScore: input.sleepQualityScore ?? null,
      caffeineIntakeMg: input.caffeineIntakeMg ?? null,
      interruptionCount: input.interruptionCount ?? null,
      recoveryFeelingScore: input.recoveryFeelingScore ?? null,
      createdAt: now,
      updatedAt: now
    };

    await dynamoDocumentClient.send(
      new PutCommand({
        TableName: appTableName,
        Item: toSleepLogItem(log),
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)"
      })
    );

    return log;
  }

  public async listByShiftId(shiftId: string): Promise<SleepLog[]> {
    const result = await dynamoDocumentClient.send(
      new QueryCommand({
        TableName: appTableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :logPrefix)",
        ExpressionAttributeValues: {
          ":pk": buildLogPk(shiftId),
          ":logPrefix": "LOG#"
        }
      })
    );

    const items = (result.Items ?? []).filter(isSleepLogItem);

    return items.map(toSleepLogModel).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  public async ensureLogsExistForShift(shiftId: string): Promise<SleepLog[]> {
    const logs = await this.listByShiftId(shiftId);

    if (logs.length === 0) {
      throw new NotFoundError("Sleep logs were not found for the shift");
    }

    return logs;
  }
}

export const sleepLogRepository = new SleepLogRepository();
