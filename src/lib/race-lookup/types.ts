export type RaceLookupSource = "RUNSIGNUP" | "WEB_SEARCH";
export type LookupTerrainType = "ROAD" | "TRAIL" | "MIXED" | "UNKNOWN";

export interface RaceLookupResult {
  source: RaceLookupSource;
  externalId?: string;
  name: string;
  raceDate: Date | null;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  distanceMeters: number | null;
  terrainType: LookupTerrainType;
  elevationGainMeters: number | null;
  courseUrl?: string;
  sourceUrl?: string;
  raw?: unknown;
}

export interface RaceLookupQuery {
  name: string;
  city?: string;
  state?: string;
}
