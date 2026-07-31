import { prisma } from "@/lib/db";
import { parseLocalDate } from "@/lib/utils/date";
import type { TerrainType } from "@/generated/prisma/client";

const MILES_TO_METERS = 1609.34;

export interface CuratedMajorRace {
  slug: string; // stable externalId, e.g. "boston-marathon"
  name: string; // official/registered name
  commonName?: string; // popular name, only set when it genuinely differs from `name`
  raceDate: string; // YYYY-MM-DD, next confirmed upcoming date
  city: string;
  state: string;
  distanceMiles: number;
  terrainType: TerrainType;
  slogan?: string;
  description: string;
  participantCount?: number;
  websiteUrl?: string;
  registrationUrl?: string;
}

/**
 * Hand-curated list of major US races that don't use RunSignup for
 * registration (they run their own systems), so the bulk sync in
 * runsignup-sync.ts never finds them -- see KNOWLEDGE notes in Phase 9 of
 * the plan. Every date/website URL below was verified against a live search
 * during this list's creation, not guessed; fields I couldn't verify
 * confidently (most logo URLs, a few exact registration sub-paths,
 * participant counts for lesser-known races) are left null rather than
 * fabricated -- fill those in by hand later from the race's own site.
 * Dates are the *next* confirmed upcoming occurrence as of when this list
 * was written; each needs a manual bump once the following year's date is
 * announced (this list is not touched by the automated sync job).
 */
export const CURATED_MAJOR_RACES: CuratedMajorRace[] = [
  {
    slug: "boston-marathon",
    name: "B.A.A. Boston Marathon",
    commonName: "Boston Marathon",
    raceDate: "2027-04-19",
    city: "Boston",
    state: "MA",
    distanceMiles: 26.2,
    terrainType: "ROAD",
    description:
      "The world's oldest annual marathon (run since 1897) and the only World Marathon Major that requires most entrants to run a qualifying time. Run point-to-point from Hopkinton to Boston on Patriots' Day.",
    participantCount: 30000,
    websiteUrl: "https://www.baa.org/races/boston-marathon/",
  },
  {
    slug: "nyc-marathon",
    name: "TCS New York City Marathon",
    commonName: "NYC Marathon",
    raceDate: "2026-11-01",
    city: "New York",
    state: "NY",
    distanceMiles: 26.2,
    terrainType: "ROAD",
    description:
      "The world's largest marathon by finishers, running through all five NYC boroughs from Staten Island to Central Park.",
  },
  {
    slug: "chicago-marathon",
    name: "Bank of America Chicago Marathon",
    commonName: "Chicago Marathon",
    raceDate: "2026-10-11",
    city: "Chicago",
    state: "IL",
    distanceMiles: 26.2,
    terrainType: "ROAD",
    description:
      "A World Marathon Major known for its flat, fast course through Chicago's neighborhoods -- a frequent site of world and course records.",
  },
  {
    slug: "marine-corps-marathon",
    name: "Marine Corps Marathon",
    commonName: "MCM",
    raceDate: "2026-10-25",
    city: "Arlington",
    state: "VA",
    distanceMiles: 26.2,
    terrainType: "ROAD",
    description:
      "\"The People's Marathon\" -- run and organized by the U.S. Marine Corps through Washington, D.C. and Arlington, one of the largest marathons in the world with no cash prizes or elite appearance fees.",
    websiteUrl: "https://www.marinemarathon.com/",
  },
  {
    slug: "twin-cities-marathon",
    name: "Medtronic Twin Cities Marathon",
    commonName: "Twin Cities Marathon",
    raceDate: "2026-10-04",
    city: "Minneapolis",
    state: "MN",
    distanceMiles: 26.2,
    terrainType: "ROAD",
    description:
      "Known as \"the most beautiful urban marathon in America,\" running from Minneapolis to the Minnesota State Capitol in St. Paul past a chain of lakes.",
    websiteUrl: "https://www.tcmevents.org/",
  },
  {
    slug: "big-sur-international-marathon",
    name: "Big Sur International Marathon",
    raceDate: "2027-04-25",
    city: "Carmel-by-the-Sea",
    state: "CA",
    distanceMiles: 26.2,
    terrainType: "ROAD",
    description:
      "Widely considered one of the most scenic marathons in the world, run along Highway 1 on the rugged Big Sur coastline, capped at a limited field size.",
    websiteUrl: "https://www.bigsurmarathon.org/",
  },
  {
    slug: "california-international-marathon",
    name: "California International Marathon",
    commonName: "CIM",
    raceDate: "2026-12-06",
    city: "Sacramento",
    state: "CA",
    distanceMiles: 26.2,
    terrainType: "ROAD",
    description:
      "A net point-to-point downhill course from Folsom to Sacramento, popular as a fast Boston-qualifying and PR race late in the calendar year.",
    websiteUrl: "https://runsra.org/california-international-marathon/",
  },
  {
    slug: "grandmas-marathon",
    name: "Grandma's Marathon",
    raceDate: "2027-06-19",
    city: "Duluth",
    state: "MN",
    distanceMiles: 26.2,
    terrainType: "ROAD",
    description: "A scenic point-to-point course along the shore of Lake Superior into Duluth, one of the largest marathons in the Midwest.",
    websiteUrl: "https://grandmasmarathon.com/",
  },
  {
    slug: "flying-pig-marathon",
    name: "Flying Pig Marathon",
    raceDate: "2027-05-02",
    city: "Cincinnati",
    state: "OH",
    distanceMiles: 26.2,
    terrainType: "ROAD",
    description: "Cincinnati's marathon weekend, known for its lighthearted pig theme and a large accompanying 5K/10K/relay/half marathon lineup.",
    websiteUrl: "https://flyingpigmarathon.com/",
  },
  {
    slug: "houston-marathon",
    name: "Chevron Houston Marathon",
    commonName: "Houston Marathon",
    raceDate: "2027-01-17",
    city: "Houston",
    state: "TX",
    distanceMiles: 26.2,
    terrainType: "ROAD",
    description: "A fast, flat January marathon that frequently serves as a U.S. Olympic Marathon Trials qualifier race.",
    websiteUrl: "https://www.chevronhoustonmarathon.com/",
  },
  {
    slug: "los-angeles-marathon",
    name: "Los Angeles Marathon",
    commonName: "LA Marathon",
    raceDate: "2027-03-07",
    city: "Los Angeles",
    state: "CA",
    distanceMiles: 26.2,
    terrainType: "ROAD",
    description: "\"The Stadium to the Sea\" -- a point-to-point course from Dodger Stadium to the Santa Monica coast.",
  },
  {
    slug: "peachtree-road-race",
    name: "AJC Peachtree Road Race",
    commonName: "Peachtree Road Race",
    raceDate: "2027-07-04",
    city: "Atlanta",
    state: "GA",
    distanceMiles: 6.2,
    terrainType: "ROAD",
    description: "The world's largest 10K, run every July 4th through Atlanta -- a long-running American Independence Day tradition.",
    websiteUrl: "https://www.atlantatrackclub.org/",
  },
  {
    slug: "bay-to-breakers",
    name: "Bay to Breakers",
    raceDate: "2027-05-16",
    city: "San Francisco",
    state: "CA",
    distanceMiles: 7.46,
    terrainType: "ROAD",
    description: "One of the oldest consecutively-run footraces in the world (since 1912), famous for its costumed runners and centipede relay teams as much as the racing.",
    websiteUrl: "https://www.baytobreakers.com/",
  },
  {
    slug: "falmouth-road-race",
    name: "ASICS Falmouth Road Race",
    commonName: "Falmouth Road Race",
    raceDate: "2026-08-16",
    city: "Falmouth",
    state: "MA",
    distanceMiles: 7,
    terrainType: "ROAD",
    description: "A storied Cape Cod summer road race from Woods Hole to Falmouth Heights that has drawn top elite fields for decades.",
    websiteUrl: "https://falmouthroadrace.com/",
  },
  {
    slug: "bolder-boulder",
    name: "BOLDERBoulder",
    commonName: "Bolder Boulder 10K",
    raceDate: "2027-05-31",
    city: "Boulder",
    state: "CO",
    distanceMiles: 6.2,
    terrainType: "ROAD",
    description: "A Memorial Day 10K tradition in Boulder with tens of thousands of participants, finishing inside Folsom Field.",
    websiteUrl: "https://www.bolderboulder.com/",
  },
  {
    slug: "western-states-100",
    name: "Western States 100-Mile Endurance Run",
    commonName: "Western States 100",
    raceDate: "2027-06-26",
    city: "Olympic Valley",
    state: "CA",
    distanceMiles: 100,
    terrainType: "TRAIL",
    description: "The oldest 100-mile trail race in the world and widely considered the sport's most prestigious ultramarathon, from Olympic Valley to Auburn via the Sierra Nevada -- entry is by lottery.",
    websiteUrl: "https://www.wser.org/",
  },
  {
    slug: "leadville-trail-100-run",
    name: "Leadville Trail 100 Run",
    commonName: "Leadville 100",
    raceDate: "2026-08-22",
    city: "Leadville",
    state: "CO",
    distanceMiles: 100,
    terrainType: "TRAIL",
    slogan: "Dare to Be Great",
    description: "A high-altitude 100-mile trail race (10,000+ feet for most of the course) through the Colorado Rockies, part of the Leadville Race Series.",
    websiteUrl: "https://www.leadvilleraceseries.com/run/leadvilletrail100run/",
  },
  {
    slug: "badwater-135",
    name: "Badwater 135",
    commonName: "Badwater Ultramarathon",
    raceDate: "2027-07-19",
    city: "Death Valley",
    state: "CA",
    distanceMiles: 135,
    terrainType: "ROAD",
    description: "Widely billed as \"the world's toughest foot race\" -- from Death Valley (the lowest point in North America) to Mt. Whitney Portal, run in extreme summer heat. Invitation-only entry.",
    websiteUrl: "https://www.badwater.com/",
  },
  {
    slug: "jfk-50-mile",
    name: "JFK 50 Mile",
    raceDate: "2026-11-21",
    city: "Boonsboro",
    state: "MD",
    distanceMiles: 50,
    terrainType: "MIXED",
    description: "The oldest and largest ultramarathon in the United States (first run in 1963), combining Appalachian Trail singletrack, the C&O Canal towpath, and rural roads.",
    websiteUrl: "https://www.jfk50mile.org/",
  },
];

function toDistanceMeters(miles: number): number {
  return miles * MILES_TO_METERS;
}

/**
 * Upserts the curated majors list, keyed on @@unique([source, externalId])
 * using each race's stable slug as externalId -- safe to re-run any time
 * (e.g. after hand-editing a date above) without creating duplicates.
 */
export async function seedCuratedMajors(): Promise<{ upserted: number }> {
  let upserted = 0;

  for (const race of CURATED_MAJOR_RACES) {
    const data = {
      name: race.name,
      commonName: race.commonName ?? null,
      raceDate: parseLocalDate(race.raceDate),
      city: race.city,
      state: race.state,
      country: "US",
      distanceMeters: toDistanceMeters(race.distanceMiles),
      terrainType: race.terrainType,
      slogan: race.slogan ?? null,
      description: race.description,
      participantCount: race.participantCount ?? null,
      websiteUrl: race.websiteUrl ?? null,
      registrationUrl: race.registrationUrl ?? race.websiteUrl ?? null,
      lastSyncedAt: new Date(),
    };

    await prisma.race.upsert({
      where: { source_externalId: { source: "CURATED", externalId: race.slug } },
      create: { source: "CURATED", externalId: race.slug, ...data },
      update: data,
    });
    upserted++;
  }

  return { upserted };
}
