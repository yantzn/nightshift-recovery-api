import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { AppError } from "../utils/errors";

const getRegion = (): string => {
  return process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "ap-northeast-1";
};

const getTableName = (): string => {
  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new AppError("DynamoDB table name is not configured", 500, "CONFIGURATION_ERROR");
  }

  return tableName;
};

const createBaseClient = (): DynamoDBClient => {
  const endpoint = process.env.DYNAMODB_ENDPOINT;
  const region = getRegion();

  if (endpoint) {
    return new DynamoDBClient({
      region,
      endpoint,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local"
      }
    });
  }

  return new DynamoDBClient({
    region
  });
};

const baseClient = createBaseClient();

export const dynamoDocumentClient = DynamoDBDocumentClient.from(baseClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false
  },
  unmarshallOptions: {
    wrapNumbers: false
  }
});

export const appTableName = getTableName();
