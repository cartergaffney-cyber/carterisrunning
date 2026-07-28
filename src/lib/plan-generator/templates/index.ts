import { DistanceCategory, PlanTemplate, RaceDistance } from "../types";
import { shortTemplate } from "./short";
import { halfTemplate } from "./half";
import { marathonTemplate } from "./marathon";
import { ultraTemplate } from "./ultra";
import { hundredTemplate } from "./hundred";

export const DISTANCE_MILES: Record<RaceDistance, number> = {
  FIVE_K: 3.107,
  TEN_K: 6.214,
  HALF_MARATHON: 13.109,
  MARATHON: 26.219,
  FIFTY_K: 31.069,
  FIFTY_MILE: 50,
  HUNDRED_K: 62.137,
  HUNDRED_MILE: 100,
};

export const DISTANCE_LABELS: Record<RaceDistance, string> = {
  FIVE_K: "5K",
  TEN_K: "10K",
  HALF_MARATHON: "Half Marathon",
  MARATHON: "Marathon",
  FIFTY_K: "50K",
  FIFTY_MILE: "50 Mile",
  HUNDRED_K: "100K",
  HUNDRED_MILE: "100 Mile",
};

const CATEGORY_BY_DISTANCE: Record<RaceDistance, DistanceCategory> = {
  FIVE_K: "SHORT",
  TEN_K: "SHORT",
  HALF_MARATHON: "HALF",
  MARATHON: "MARATHON",
  FIFTY_K: "ULTRA",
  FIFTY_MILE: "ULTRA",
  HUNDRED_K: "HUNDRED",
  HUNDRED_MILE: "HUNDRED",
};

const TEMPLATE_BY_CATEGORY: Record<DistanceCategory, PlanTemplate> = {
  SHORT: shortTemplate,
  HALF: halfTemplate,
  MARATHON: marathonTemplate,
  ULTRA: ultraTemplate,
  HUNDRED: hundredTemplate,
};

export function getDistanceCategory(raceDistance: RaceDistance): DistanceCategory {
  return CATEGORY_BY_DISTANCE[raceDistance];
}

export function getTemplate(raceDistance: RaceDistance): PlanTemplate {
  return TEMPLATE_BY_CATEGORY[getDistanceCategory(raceDistance)];
}
