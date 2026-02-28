import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, derived] = storedHash.split(":");
  if (!salt || !derived) {
    return false;
  }

  const attempted = scryptSync(password, salt, KEY_LEN).toString("hex");
  return timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(attempted, "hex"));
}
