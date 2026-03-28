import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

import { ENV } from "./env";

let initialized = false;
let inFlight: Promise<void> | null = null;
let cachedAt: number | null = null;

const isCacheValid = (): boolean => {
  if (!initialized || cachedAt === null) {
    return false;
  }

  return Date.now() - cachedAt < ENV.secretsTtlMs;
};

const applySecretPayload = (payload: Record<string, unknown>): void => {
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" && !process.env[key]) {
      process.env[key] = value;
    }
  }
};

export const initSecrets = async (): Promise<void> => {
  if (ENV.isLocal || !ENV.appSecretsId) {
    return;
  }

  if (isCacheValid()) {
    return;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const client = new SecretsManagerClient({
      region: ENV.awsRegion
    });

    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: ENV.appSecretsId
      })
    );

    if (!response.SecretString) {
      initialized = true;
      cachedAt = Date.now();
      inFlight = null;
      return;
    }

    try {
      const parsed = JSON.parse(response.SecretString) as Record<string, unknown>;
      applySecretPayload(parsed);
    } catch {
      process.env.JWT_SECRET ??= response.SecretString;
    }

    initialized = true;
    cachedAt = Date.now();
    inFlight = null;
  })();

  return inFlight;
};
