export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class SearchNotConfiguredError extends Error {
  constructor() {
    super("No web search provider configured (set SEARCH_API_PROVIDER=serpapi and SERPAPI_API_KEY).");
    this.name = "SearchNotConfiguredError";
  }
}

export async function searchWeb(query: string, numResults = 5): Promise<SearchResult[]> {
  const provider = process.env.SEARCH_API_PROVIDER;

  if (provider === "serpapi" && process.env.SERPAPI_API_KEY) {
    const { searchSerpApi } = await import("./serpapi");
    return searchSerpApi(query, numResults);
  }

  throw new SearchNotConfiguredError();
}
