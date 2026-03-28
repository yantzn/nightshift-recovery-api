import jwt, { type JwtPayload } from "jsonwebtoken";
import { z } from "zod";

import type { AuthContext, JwtClaims } from "../models/types";
import { ForbiddenError, UnauthorizedError } from "./errors";

/**
 * Authorizationヘッダ検証
 */
const bearerTokenSchema = z
  .string()
  .min(1)
  .refine((value) => value.startsWith("Bearer "), {
    message: "Authorization header must use Bearer scheme"
  });

/**
 * JWTペイロード検証
 * ※余分なフィールドは許容（passthrough）
 */
const claimsSchema = z
  .object({
    sub: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    email: z.string().email().optional(),
    scope: z.union([z.string(), z.array(z.string())]).optional(),
    iat: z.number().optional(),
    exp: z.number().optional(),
    iss: z.string().optional(),
    aud: z.union([z.string(), z.array(z.string())]).optional()
  })
  .passthrough();

/**
 * JWT secret取得
 */
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new UnauthorizedError("JWT secret is not configured");
  }

  return secret;
};

/**
 * Bearerトークン抽出
 */
const extractBearerToken = (authorizationHeader?: string): string => {
  if (!authorizationHeader) {
    throw new UnauthorizedError("Authorization header is required");
  }

  const parsed = bearerTokenSchema.safeParse(authorizationHeader);

  if (!parsed.success) {
    throw new UnauthorizedError("Authorization header must be a valid Bearer token");
  }

  return parsed.data.replace(/^Bearer\s+/u, "").trim();
};

/**
 * JWT verify（安全に実行）
 */
const verifyJwt = (token: string): JwtPayload => {
  const secret = getJwtSecret();

  let decoded: string | JwtPayload;

  try {
    decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"]
    });
  } catch {
    throw new UnauthorizedError("JWT verification failed");
  }

  if (typeof decoded === "string") {
    throw new UnauthorizedError("JWT payload must be an object");
  }

  return decoded;
};

/**
 * claims正規化
 */
const normalizeClaims = (payload: JwtPayload): JwtClaims => {
  const parsed = claimsSchema.safeParse(payload);

  if (!parsed.success) {
    throw new UnauthorizedError("JWT payload validation failed");
  }

  return parsed.data as JwtClaims;
};

/**
 * userId抽出（sub優先 fallback）
 */
const extractUserId = (claims: JwtClaims): string => {
  const userId = claims.userId ?? claims.sub;

  if (!userId || typeof userId !== "string") {
    throw new UnauthorizedError("JWT does not contain a valid user identifier");
  }

  return userId;
};

/**
 * 公開API：JWT検証
 */
export const verifyJwtToken = (authorizationHeader?: string): AuthContext => {
  const rawToken = extractBearerToken(authorizationHeader);
  const payload = verifyJwt(rawToken);
  const claims = normalizeClaims(payload);
  const userId = extractUserId(claims);

  return {
    userId,
    claims,
    rawToken
  };
};

/**
 * 認可チェック（他人アクセス防止）
 */
export const assertUserCanAccessResource = (
  authenticatedUserId: string,
  resourceOwnerUserId: string
): void => {
  if (authenticatedUserId !== resourceOwnerUserId) {
    throw new ForbiddenError("You are not allowed to access another user's resource");
  }
};

/**
 * scopeチェック（将来用 RBAC）
 */
export const assertHasScope = (claims: JwtClaims, requiredScope: string): void => {
  const scope = claims.scope;

  if (!scope) {
    throw new ForbiddenError("Required scope is missing");
  }

  if (typeof scope === "string") {
    if (!scope.split(" ").includes(requiredScope)) {
      throw new ForbiddenError("Insufficient scope");
    }
    return;
  }

  if (Array.isArray(scope)) {
    if (!scope.includes(requiredScope)) {
      throw new ForbiddenError("Insufficient scope");
    }
    return;
  }

  throw new ForbiddenError("Invalid scope format");
};

/**
 * 任意：JWTの有効期限チェック（追加防御）
 */
export const assertNotExpired = (claims: JwtClaims): void => {
  if (!claims.exp) {
    return;
  }

  const now = Math.floor(Date.now() / 1000);

  if (claims.exp < now) {
    throw new UnauthorizedError("JWT is expired");
  }
};
