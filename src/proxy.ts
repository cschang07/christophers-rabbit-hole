import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SITE_AUTH_COOKIE, verifyAuthToken } from "@/lib/site-auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SITE_AUTH_COOKIE)?.value;
  if (!verifyAuthToken(token)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
