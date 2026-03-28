import { config as loadDotenv } from "dotenv";

loadDotenv();

const toBoolean = (value: string | undefined, defaultValue = false): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === "true";
};

const toNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

export const ENV = {
  get nodeEnv(): string {
    return process.env.NODE_ENV ?? "development";
  },

  get isLocal(): boolean {
    const defaultIsLocal = process.env.AWS_EXECUTION_ENV === undefined;
    return toBoolean(process.env.IS_LOCAL, defaultIsLocal);
  },

  get port(): number {
    return toNumber(process.env.PORT, 3000);
  },

  get awsRegion(): string {
    return process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "ap-northeast-1";
  },

  get dynamodbTableName(): string {
    return process.env.DYNAMODB_TABLE_NAME ?? "nightshift-recovery-dev";
  },

  get dynamodbEndpoint(): string | undefined {
    return process.env.DYNAMODB_ENDPOINT;
  },

  get logLevel(): string {
    return process.env.LOG_LEVEL ?? "info";
  },

  get jwtSecret(): string | undefined {
    return process.env.JWT_SECRET;
  },

  get appSecretsId(): string | undefined {
    return process.env.APP_SECRETS_ID;
  },

  get secretsTtlMs(): number {
    const minutes = toNumber(process.env.SECRETS_TTL_MINUTES, 60);
    return minutes * 60 * 1000;
  }
};
