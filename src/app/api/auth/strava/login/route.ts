import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildAuthorizeUrl, OAUTH_STATE_COOKIE } from "@/lib/auth/strava-oauth";

export async function GET() {
  const state = randomBytes(16).toString("hex");

  const response = NextResponse.redirect(buildAuthorizeUrl(state));
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}
