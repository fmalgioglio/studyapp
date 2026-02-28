import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { apiSuccess } from "@/server/http/response";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return apiSuccess({ ok: true });
}
