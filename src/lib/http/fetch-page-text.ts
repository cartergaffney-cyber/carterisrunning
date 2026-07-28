import * as cheerio from "cheerio";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_TEXT_LENGTH = 20_000;

export interface FetchedPage {
  url: string;
  title: string;
  text: string;
}

/**
 * Fetches a public web page and extracts its readable text, for best-effort
 * parsing of race/club pages. This is a plain HTTP GET against the page's
 * own domain — not scraping a walled platform's API-protected data.
 */
export async function fetchPageText(url: string): Promise<FetchedPage | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RunningTrainerBot/1.0)" },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    $("script, style, nav, footer, noscript").remove();

    const title = $("title").first().text().trim();
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);

    return { url, title, text };
  } catch {
    return null;
  }
}
