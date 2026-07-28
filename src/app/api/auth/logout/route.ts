import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

export async function POST() {
  await clearSession();
  return NextResponse.redirect(new URL("/login", process.env.APP_BASE_URL));
}
