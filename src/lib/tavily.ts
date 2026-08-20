const TAVILY_URL = "https://api.tavily.com/search";

export interface TavilySource {
  title: string;
  content: string;
  url: string;
  publishedDate?: string;
}

interface TavilyRaw {
  title?: string;
  content?: string;
  url?: string;
  published_date?: string;
}

interface SearchOpts {
  topic?: "news" | "general";
  maxResults?: number;
  days?: number;
  searchDepth?: "basic" | "advanced";
  includeDomains?: string[];
}

/**
 * Tavily news/search. Returns clean source records (title, content, real URL,
 * published date) suitable for feeding an LLM and building citations.
 * Returns [] on any failure so callers can degrade gracefully.
 */
export async function searchTavily(
  query: string,
  opts: SearchOpts = {},
): Promise<TavilySource[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        topic: opts.topic ?? "news",
        search_depth: opts.searchDepth ?? "basic",
        max_results: opts.maxResults ?? 8,
        days: opts.days ?? 3,
        include_domains: opts.includeDomains,
      }),
      // mirror outlook-data caching; the generation layer adds its own daily cache
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rows: TavilyRaw[] = json.results ?? [];
    return rows
      .filter((r): r is TavilyRaw & { url: string } => Boolean(r.url && r.content))
      .map((r) => ({
        title: r.title ?? r.url,
        content: r.content ?? "",
        url: r.url,
        publishedDate: r.published_date,
      }));
  } catch {
    return [];
  }
}
