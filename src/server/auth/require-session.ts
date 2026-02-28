import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";

export type AuthSession = {
  uid: string;
  email: string;
  exp: number;
};

export async function requireSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}
