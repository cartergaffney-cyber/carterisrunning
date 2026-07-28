const MAPBOX_DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox/walking";
const EARTH_RADIUS_MILES = 3958.8;
const METERS_TO_MILES = 1 / 1609.34;
const MAX_ITERATIONS = 5;
const TOLERANCE_PCT = 0.1; // within 10% of target is considered close enough

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface GeneratedRouteResult {
  points: RoutePoint[];
  actualDistanceMiles: number;
  raw: unknown;
}

/** Destination point a given distance/bearing from a start point (spherical earth approximation). */
function destinationPoint(lat: number, lng: number, bearingDeg: number, distanceMiles: number) {
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const angularDistance = distanceMiles / EARTH_RADIUS_MILES;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

async function fetchOutAndBack(
  startLat: number,
  startLng: number,
  waypointLat: number,
  waypointLng: number,
  accessToken: string
) {
  const coords = `${startLng},${startLat};${waypointLng},${waypointLat};${startLng},${startLat}`;
  const params = new URLSearchParams({
    access_token: accessToken,
    geometries: "geojson",
    overview: "full",
  });

  const response = await fetch(`${MAPBOX_DIRECTIONS_BASE}/${coords}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Mapbox Directions failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const route = data.routes?.[0];
  if (!route) {
    throw new Error("Mapbox Directions returned no route");
  }

  return { route, raw: data };
}

/**
 * Generates a best-effort out-and-back walking route matched to a target
 * distance, starting from the given point. Picks a random bearing, then
 * iterates the out-leg distance against Mapbox Directions until the actual
 * round-trip distance is within tolerance (or MAX_ITERATIONS is hit, in
 * which case the closest attempt is returned). Elevation is not sampled --
 * this reports actual distance only, never a guaranteed elevation profile.
 */
export async function generateOutAndBackRoute(
  startLat: number,
  startLng: number,
  targetDistanceMiles: number
): Promise<GeneratedRouteResult> {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MAPBOX_ACCESS_TOKEN is not set");
  }

  const bearing = Math.floor(Math.random() * 360);
  let legDistanceMiles = targetDistanceMiles / 2;

  let best: GeneratedRouteResult | null = null;
  let bestDiff = Infinity;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const waypoint = destinationPoint(startLat, startLng, bearing, legDistanceMiles);
    const { route, raw } = await fetchOutAndBack(startLat, startLng, waypoint.lat, waypoint.lng, accessToken);

    const actualDistanceMiles = route.distance * METERS_TO_MILES;
    const diff = Math.abs(actualDistanceMiles - targetDistanceMiles) / targetDistanceMiles;

    const points: RoutePoint[] = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
    const result: GeneratedRouteResult = { points, actualDistanceMiles, raw };

    if (diff < bestDiff) {
      bestDiff = diff;
      best = result;
    }

    if (diff <= TOLERANCE_PCT) {
      return result;
    }

    legDistanceMiles = legDistanceMiles * (targetDistanceMiles / actualDistanceMiles);
  }

  return best!;
}
