import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, OAUTH_STATE_COOKIE } from "@/lib/auth/strava-oauth";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }

  const tokenResponse = await exchangeCodeForToken(code);

  if (!tokenResponse.athlete) {
    return NextResponse.redirect(new URL("/login?error=missing_athlete", request.url));
  }

  const { athlete } = tokenResponse;

  const user = await prisma.user.upsert({
    where: { stravaAthleteId: BigInt(athlete.id) },
    create: {
      stravaAthleteId: BigInt(athlete.id),
      firstName: athlete.firstname,
      lastName: athlete.lastname,
      profileImageUrl: athlete.profile,
      stravaAccessToken: tokenResponse.access_token,
      stravaRefreshToken: tokenResponse.refresh_token,
      stravaTokenExpiresAt: new Date(tokenResponse.expires_at * 1000),
    },
    update: {
      firstName: athlete.firstname,
      lastName: athlete.lastname,
      profileImageUrl: athlete.profile,
      stravaAccessToken: tokenResponse.access_token,
      stravaRefreshToken: tokenResponse.refresh_token,
      stravaTokenExpiresAt: new Date(tokenResponse.expires_at * 1000),
    },
  });

  await createSession(user.id);

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}
