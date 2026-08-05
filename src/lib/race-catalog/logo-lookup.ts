import { prisma } from "@/lib/db";

const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = "Mozilla/5.0 (compatible; CarterIsRunningBot/1.0; +https://www.carterisrunning.com)";
const MAX_HTML_BYTES = 400_000;

/**
 * Pulls a race's own logo from its own website, rather than trusting an
 * aggregator's image field. That distinction matters: findarace.com exposes
 * an `image` per event, but it's a shared stock photo (the same London
 * triathlon shot appears on unrelated races), so it would be actively
 * misleading as a logo.
 *
 * Preference order is chosen for the small square slot these render in:
 *  1. apple-touch-icon -- square by spec and almost always the brand mark
 *  2. og:image / twitter:image -- reliably present, but often a wide hero
 *     banner that reads poorly shrunk into an avatar
 *  3. <link rel="icon"> -- last resort, frequently a tiny favicon
 *
 * Returns null rather than guessing when nothing usable is declared.
 */

interface LogoCandidate {
  pattern: RegExp;
  /** Which capture group holds the URL. */
  group: number;
}

// Attribute order varies between sites, so each tag is matched in both
// orders (content-then-property and property-then-content).
const CANDIDATES: LogoCandidate[] = [
  { pattern: /<link[^>]+rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*href=["']([^"']+)["']/i, group: 1 },
  { pattern: /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon(?:-precomposed)?["']/i, group: 1 },
  { pattern: /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i, group: 1 },
  { pattern: /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i, group: 1 },
  { pattern: /<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i, group: 1 },
  { pattern: /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i, group: 1 },
];

// Placeholder/spacer images some sites declare in og:image; storing one of
// these is worse than storing nothing, since the tile would render a blank
// or generic box as if it were the race's brand.
const REJECT_URL_PATTERNS = [/data:/i, /\.svg\+xml/i, /placeholder/i, /spacer/i, /1x1\./i, /blank\./i];

function isUsableLogoUrl(url: string): boolean {
  if (!url || url.length > 500) return false;
  return !REJECT_URL_PATTERNS.some((p) => p.test(url));
}

export async function findLogoUrl(websiteUrl: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(websiteUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT },
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return null;

  const html = (await response.text()).slice(0, MAX_HTML_BYTES);

  for (const { pattern, group } of CANDIDATES) {
    const match = html.match(pattern);
    if (!match) continue;

    const raw = match[group]?.trim();
    if (!raw || !isUsableLogoUrl(raw)) continue;

    try {
      // Resolves protocol-relative ("//cdn/...") and root-relative
      // ("/logo.png") hrefs against the page they were declared on.
      return new URL(raw, response.url).toString();
    } catch {
      continue;
    }
  }

  return null;
}

const BACKFILL_BATCH_LIMIT = 40;
const BACKFILL_DELAY_MS = 250;

export interface LogoBackfillResult {
  checked: number;
  found: number;
}

/**
 * Fills in logos for catalog races that have a website but no logo yet --
 * in practice the curated majors and findarace-discovered races, since
 * RunSignup supplies its own logo directly. Safe to re-run: it only ever
 * looks at rows still missing a logo, and a site that yields nothing is
 * simply left null for a later pass.
 */
export async function backfillMissingLogos(limit = BACKFILL_BATCH_LIMIT): Promise<LogoBackfillResult> {
  const races = await prisma.race.findMany({
    where: { logoUrl: null, websiteUrl: { not: null } },
    take: limit,
  });

  let found = 0;

  for (const race of races) {
    if (!race.websiteUrl) continue;
    const logoUrl = await findLogoUrl(race.websiteUrl);
    if (logoUrl) {
      await prisma.race.update({ where: { id: race.id }, data: { logoUrl } });
      found++;
    }
    await new Promise((resolve) => setTimeout(resolve, BACKFILL_DELAY_MS));
  }

  return { checked: races.length, found };
}
