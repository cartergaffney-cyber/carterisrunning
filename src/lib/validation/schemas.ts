import { z } from "zod";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const createPlanSchema = z.object({
  raceDistance: z.enum([
    "FIVE_K",
    "TEN_K",
    "HALF_MARATHON",
    "MARATHON",
    "FIFTY_K",
    "FIFTY_MILE",
    "HUNDRED_K",
    "HUNDRED_MILE",
  ]),
  raceDate: z.string().regex(DATE_ONLY_PATTERN, "raceDate must be YYYY-MM-DD"),
  currentWeeklyMileageMiles: z.number().positive().max(300),
  goalTimeSeconds: z.number().int().positive().optional(),
  raceId: z.string().optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const raceSearchSchema = z.object({
  name: z.string().min(1).max(200),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
});

export type RaceSearchInput = z.infer<typeof raceSearchSchema>;

export const createRaceSchema = z.object({
  name: z.string().min(1).max(200),
  source: z.enum(["RUNSIGNUP", "WEB_SEARCH", "MANUAL"]),
  externalId: z.string().optional(),
  raceDate: z.string().regex(DATE_ONLY_PATTERN, "raceDate must be YYYY-MM-DD").optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  zipcode: z.string().max(20).optional(),
  distanceMeters: z.number().positive().optional(),
  terrainType: z.enum(["ROAD", "TRAIL", "MIXED", "UNKNOWN"]).default("UNKNOWN"),
  elevationGainMeters: z.number().nonnegative().optional(),
  courseUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
});

export type CreateRaceInput = z.infer<typeof createRaceSchema>;

export const updateAddressSchema = z.object({
  address: z.string().min(3).max(300),
});

export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
