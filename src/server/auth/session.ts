import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "studyapp_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const DEV_FALLBACK_AUTH_SECRET = "studyapp-dev-auth-secret-please-change";

type SessionPayload = {
  uid: string;
  email: string;
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (secret && secret.length >= 16) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_FALLBACK_AUTH_SECRET;
  }

  throw new Error("AUTH_SECRET must be set and at least 16 characters long.");
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64 + padding, "base64");
}

function sign(value: string) {
  return toBase64Url(createHmac("sha256", getAuthSecret()).update(value).digest());
}

function shouldUseSecureCookies() {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_INSECURE_AUTH_COOKIES !== "true"
  );
}

export function createSessionToken(uid: string, email: string) {
  const payload: SessionPayload = {
    uid,
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  if (signature.length !== expectedSignature.length) {
    return null;
  }

  const isValid = timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expectedSignature, "utf8"),
  );

  if (!isValid) {
    return null;
  }

  try {
    const payload = JSON.parse(
      fromBase64Url(encodedPayload).toString("utf8"),
    ) as SessionPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
