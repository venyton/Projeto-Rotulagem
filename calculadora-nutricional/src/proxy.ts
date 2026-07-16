import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

function buildContentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com https://unavatar.io https://media.licdn.com https://images.openfoodfacts.org https://static.openfoodfacts.org",
    "font-src 'self' data:",
    isDev ? "connect-src 'self' http: https: ws: wss:" : "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export default async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const authSecret = process.env.NEXTAUTH_SECRET;
    if (process.env.NODE_ENV === "production" && (!authSecret || authSecret.length < 32)) {
      return new NextResponse("Serviço indisponível", { status: 503 });
    }
    const secureCookie = process.env.SESSION_COOKIE_SECURE
      ? process.env.SESSION_COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production";
    const token = await getToken({
      req: request,
      secret: authSecret,
      cookieName: secureCookie ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    });
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.png).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
