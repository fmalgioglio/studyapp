import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getHostname(host: string) {
  if (!host) {
    return "";
  }

  if (host.startsWith("[")) {
    const closingBracketIndex = host.indexOf("]");
    return closingBracketIndex >= 0
      ? host.slice(1, closingBracketIndex)
      : host;
  }

  return host.split(":")[0]?.trim() ?? "";
}

function shouldRedirectToCanonicalHost(host: string) {
  const hostname = getHostname(host);
  return hostname === "127.0.0.1" || hostname === "::1";
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
  const redirectStatus =
    request.method === "GET" || request.method === "HEAD" ? 308 : 307;

  return NextResponse.redirect(redirectUrl, redirectStatus);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
