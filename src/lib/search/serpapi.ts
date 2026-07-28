import type { SearchResult } from "./search-client";

const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";

interface SerpApiOrganicResult {
  title: string;
  link: string;
  snippet?: string;
}

interface SerpApiResponse {
  organic_results?: SerpApiOrganicResult[];
}

export async function searchSerpApi(query: string, numResults: number): Promise<SearchResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not set");
  }

  const params = new URLSearchParams({
    engine: "google",
    q: query,
    api_key: apiKey,
    num: String(numResults),
  });

  const response = await fetch(`${SERPAPI_ENDPOINT}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`SerpApi search failed: ${response.status} ${await response.text()}`);
  }

  const data: SerpApiResponse = await response.json();

  return (data.organic_results ?? []).map((result) => ({
    title: result.title,
    url: result.link,
    snippet: result.snippet ?? "",
  }));
}
