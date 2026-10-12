import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/callback");

  if (isAuthCallback) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("sb-access-token")?.value;
  const refreshToken = request.cookies.get("sb-refresh-token")?.value;

  if (!accessToken) {
    if (isLoginPage) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const payload = parseJwt(accessToken);
  if (!payload) {
    return clearAndRedirect(request);
  }

  const now = Math.floor(Date.now() / 1000);
  let currentPayload = payload;

  if (payload.exp && (payload.exp as number) < now) {
    if (!refreshToken) {
      return clearAndRedirect(request);
    }

    const refreshed = await refreshAccessToken(refreshToken);
    if (!refreshed) {
      return clearAndRedirect(request);
    }

    const newPayload = parseJwt(refreshed.access_token);
    if (!newPayload) {
      return clearAndRedirect(request);
    }

    currentPayload = newPayload;

    const response = applyEmailCheck(request, currentPayload, NextResponse.next());
    const cookieOpts = {
      path: "/",
      maxAge: 604800,
      sameSite: "lax" as const,
      secure: true,
    };
    response.cookies.set("sb-access-token", refreshed.access_token, cookieOpts);
    response.cookies.set("sb-refresh-token", refreshed.refresh_token, cookieOpts);
    return response;
  }

  if (isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return applyEmailCheck(request, currentPayload, NextResponse.next());
}

function applyEmailCheck(
  request: NextRequest,
  payload: Record<string, unknown>,
  response: NextResponse
): NextResponse {
  const allowedEmail = process.env.ALLOWED_EMAIL;
  if (allowedEmail && payload.email !== allowedEmail) {
    return clearAndRedirect(request, "unauthorized");
  }
  return response;
}

function clearAndRedirect(request: NextRequest, errorParam?: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  if (errorParam) url.searchParams.set("error", errorParam);
  const response = NextResponse.redirect(url);
  response.cookies.delete("sb-access-token");
  response.cookies.delete("sb-refresh-token");
  return response;
}

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { access_token: data.access_token, refresh_token: data.refresh_token };
  } catch {
    return null;
  }
}
