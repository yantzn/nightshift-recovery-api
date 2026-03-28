import { randomUUID } from "node:crypto";

import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import type { CreateShiftInput, Shift } from "../models/types";
import { ConflictError, NotFoundError } from "../utils/errors";
import { createRequestLogger, logDebug, logInfo } from "../utils/logger";
import { appTableName, dynamoDocumentClient } from "./dynamodbClient";

const ENTITY_TYPE_SHIFT = "SHIFT";

interface ShiftItem {
  PK: string;
  SK: string;
  entityType: typeof ENTITY_TYPE_SHIFT;
  GSI1PK: string;
  GSI1SK: string;
  shiftId: string;
  userId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  napWindowStart: string;
  napWindowEnd: string;
  maxNapMinutes: number;
  createdAt: string;
  updatedAt: string;
}

const buildShiftPk = (userId: string): string => `USER#${userId}`;
const buildShiftSk = (shiftId: string): string => `SHIFT#${shiftId}`;
const buildShiftLookupPk = (shiftId: string): string => `SHIFT#${shiftId}`;
const buildShiftLookupSk = (): string => "META";

const toShiftItem = (input: Shift): ShiftItem => {
  return {
    PK: buildShiftPk(input.userId),
    SK: buildShiftSk(input.shiftId),
    entityType: ENTITY_TYPE_SHIFT,
    GSI1PK: buildShiftLookupPk(input.shiftId),
    GSI1SK: buildShiftLookupSk(),
    shiftId: input.shiftId,
    userId: input.userId,
    shiftDate: input.shiftDate,
    startTime: input.startTime,
    endTime: input.endTime,
    napWindowStart: input.napWindowStart,
    napWindowEnd: input.napWindowEnd,
    maxNapMinutes: input.maxNapMinutes,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  };
};

const toShiftModel = (item: ShiftItem): Shift => {
  return {
    shiftId: item.shiftId,
    userId: item.userId,
    shiftDate: item.shiftDate,
    startTime: item.startTime,
    endTime: item.endTime,
    napWindowStart: item.napWindowStart,
    napWindowEnd: item.napWindowEnd,
    maxNapMinutes: item.maxNapMinutes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

const isShiftItem = (value: unknown): value is ShiftItem => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<ShiftItem>;

  return (
    item.entityType === ENTITY_TYPE_SHIFT &&
    typeof item.shiftId === "string" &&
    typeof item.userId === "string" &&
    typeof item.shiftDate === "string" &&
    typeof item.startTime === "string" &&
    typeof item.endTime === "string" &&
    typeof item.napWindowStart === "string" &&
    typeof item.napWindowEnd === "string" &&
    typeof item.maxNapMinutes === "number" &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string"
  );
};

export class ShiftRepository {
  public async create(input: CreateShiftInput): Promise<Shift> {
    const now = new Date().toISOString();
    const shift: Shift = {
      shiftId: randomUUID(),
      userId: input.userId,
      shiftDate: input.shiftDate,
      startTime: input.startTime,
      endTime: input.endTime,
      napWindowStart: input.napWindowStart,
      napWindowEnd: input.napWindowEnd,
      maxNapMinutes: input.maxNapMinutes,
      createdAt: now,
      updatedAt: now
    };

    const item = toShiftItem(shift);

    await dynamoDocumentClient.send(
      new PutCommand({
        TableName: appTableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)"
      })
    );

    return shift;
  }

  public async getById(shiftId: string, userId: string): Promise<Shift> {
    const result = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: appTableName,
        Key: {
          PK: buildShiftPk(userId),
          SK: buildShiftSk(shiftId)
        }
      })
    );

    if (!isShiftItem(result.Item)) {
      throw new NotFoundError("Shift was not found");
    }

    return toShiftModel(result.Item);
  }

  public async listByUserId(userId: string): Promise<Shift[]> {
    const result = await dynamoDocumentClient.send(
      new QueryCommand({
        TableName: appTableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :shiftPrefix)",
        ExpressionAttributeValues: {
          ":pk": buildShiftPk(userId),
          ":shiftPrefix": "SHIFT#"
        }
      })
    );

    const items = (result.Items ?? []).filter(isShiftItem);

    return items.map(toShiftModel).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  public async deleteById(shiftId: string, userId: string): Promise<void> {
    const existing = await this.getById(shiftId, userId);

    if (!existing) {
      throw new NotFoundError("Shift was not found");
    }

    await dynamoDocumentClient.send(
      new DeleteCommand({
        TableName: appTableName,
        Key: {
          PK: buildShiftPk(userId),
          SK: buildShiftSk(shiftId)
        }
      })
    );
  }

  public async createIfNotDuplicate(input: CreateShiftInput): Promise<Shift> {
    const existing = await this.listByUserId(input.userId);
    const duplicate = existing.find((shift) => {
      return (
        shift.shiftDate === input.shiftDate &&
        shift.startTime === input.startTime &&
        shift.endTime === input.endTime
      );
    });

    if (duplicate) {
      throw new ConflictError("A shift with the same date and time already exists");
    }

    return this.create(input);
  }
}

export const shiftRepository = new ShiftRepository();
