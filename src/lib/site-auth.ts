import crypto from "node:crypto";

export const SITE_AUTH_COOKIE = "site_auth";
export const SITE_AUTH_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

function getSecret() {
  const secret = process.env.SITE_PASSWORD;
  if (!secret) throw new Error("SITE_PASSWORD is not set");
  return secret;
}

function timingSafeStringEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Token proves "the request once supplied SITE_PASSWORD" without storing the
// password itself in the cookie.
export function createAuthToken() {
  return crypto.createHmac("sha256", getSecret()).update("authenticated").digest("hex");
}

export function verifyAuthToken(token: string | undefined | null): boolean {
  if (!token) return false;
  return timingSafeStringEqual(token, createAuthToken());
}

export function verifyPassword(password: string): boolean {
  return timingSafeStringEqual(password, getSecret());
}
