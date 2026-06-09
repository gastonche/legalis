import type { SearchProvider, WebResult } from "../ports";

interface TavilyResult {
  title?: string;
  url: string;
  content?: string;
  raw_content?: string | null;
}
interface TavilyResponse {
  results?: TavilyResult[];
}

/**
 * Allowlist-biased web search via Tavily. Tavily performs server-side readability
 * extraction, so `include_raw_content` gives clean page text we can ground + cite.
 */
export class TavilySearch implements SearchProvider {
  constructor(
    private apiKey: string,
    private endpoint = "https://api.tavily.com/search",
  ) {}

  async search(
    query: string,
    opts?: { maxResults?: number; allowlist?: string[] },
  ): Promise<WebResult[]> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        query,
        topic: "general",
        max_results: opts?.maxResults ?? 5,
        search_depth: "advanced",
        include_raw_content: true,
        ...(opts?.allowlist?.length ? { include_domains: opts.allowlist } : {}),
      }),
    });
    if (!res.ok) throw new Error(`tavily search failed (${res.status})`);
    const data = (await res.json()) as TavilyResponse;
    return (data.results ?? []).map((r) => ({
      title: r.title || r.url,
      url: r.url,
      snippet: (r.raw_content?.trim() || r.content || "").slice(0, 2400),
    }));
  }
}
