const MAPBOX_GEOCODE_URL = "https://api.mapbox.com/search/geocode/v6/forward";

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  city?: string;
  state?: string;
}

interface MapboxFeature {
  properties: {
    full_address?: string;
    coordinates: { latitude: number; longitude: number };
    context?: {
      place?: { name?: string };
      region?: { region_code?: string; name?: string };
    };
  };
}

interface MapboxGeocodeResponse {
  features: MapboxFeature[];
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MAPBOX_ACCESS_TOKEN is not set");
  }

  const params = new URLSearchParams({ q: address, access_token: accessToken, limit: "1" });
  const response = await fetch(`${MAPBOX_GEOCODE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Mapbox geocoding failed: ${response.status} ${await response.text()}`);
  }

  const data: MapboxGeocodeResponse = await response.json();
  const feature = data.features[0];
  if (!feature) return null;

  return {
    lat: feature.properties.coordinates.latitude,
    lng: feature.properties.coordinates.longitude,
    formattedAddress: feature.properties.full_address ?? address,
    city: feature.properties.context?.place?.name,
    state: feature.properties.context?.region?.region_code,
  };
}
