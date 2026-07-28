import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { updateAddressSchema } from "@/lib/validation/schemas";
import { geocodeAddress } from "@/lib/geocoding/mapbox";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await geocodeAddress(parsed.data.address);
  if (!result) {
    return NextResponse.json({ error: "Could not geocode that address." }, { status: 422 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      homeAddress: parsed.data.address,
      homeLat: result.lat,
      homeLng: result.lng,
      homeCity: result.city,
      homeState: result.state,
      homeGeocodedAt: new Date(),
    },
  });

  return NextResponse.json({ formattedAddress: result.formattedAddress, lat: result.lat, lng: result.lng });
}
