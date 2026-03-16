import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function shouldRedirectToCanonicalHost(host: string) {
  return host.startsWith("127.0.0.1") || host.startsWith("[::1]");
}

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.next();
  }

  const requestHost = request.headers.get("host") ?? "";
  const forwardedHost = request.headers.get("x-forwarded-host") ?? "";
  const nextUrl = request.nextUrl;
  const needsCanonicalRedirect =
    shouldRedirectToCanonicalHost(requestHost) ||
    shouldRedirectToCanonicalHost(forwardedHost) ||
    shouldRedirectToCanonicalHost(nextUrl.hostname);

  if (!needsCanonicalRedirect) {
    return NextResponse.next();
  }

  const redirectUrl = nextUrl.clone();
  redirectUrl.hostname = "localhost";
  redirectUrl.protocol = request.headers.get("x-forwarded-proto") ?? nextUrl.protocol;

  return NextResponse.redirect(redirectUrl, 307);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
