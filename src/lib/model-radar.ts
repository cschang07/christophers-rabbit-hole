import { GoogleGenAI, Type } from "@google/genai";
import { unstable_cache } from "next/cache";
import { searchTavily } from "@/lib/tavily";

export type ModelProvider = "Google" | "xAI" | "OpenAI" | "Anthropic";

export interface ModelReleaseItem {
  provider: ModelProvider;
  name: string;
  apiId: string | null;
  releasedAt: string;
  brief: string;
  availability: string;
  sourceUrl: string;
}

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const PROVIDERS: ModelProvider[] = ["Google", "xAI", "OpenAI", "Anthropic"];
const TRACKERS = [
  {
    provider: "Google" as const,
    query: "Google Gemini official model release notes new model launch",
    domains: ["ai.google.dev", "blog.google", "deepmind.google"],
  },
  {
    provider: "xAI" as const,
    query: "xAI Grok official release notes new model launch",
    domains: ["docs.x.ai", "x.ai"],
  },
  {
    provider: "OpenAI" as const,
    query: "OpenAI official product releases new model launch",
    domains: ["openai.com", "developers.openai.com", "help.openai.com"],
  },
  {
    provider: "Anthropic" as const,
    query: "Anthropic Claude official release notes new model launch",
    domains: ["anthropic.com", "platform.claude.com"],
  },
] as const;

// Officially verified release history. These rows appear immediately while the
// daily official-source scan streams in, and are also a floor against missed results.
const VERIFIED_RELEASES: ModelReleaseItem[] = [
  {
    provider: "OpenAI",
    name: "GPT-5.6 Sol",
    apiId: "gpt-5.6-sol",
    releasedAt: "2026-07-09",
    brief: "GPT-5.6 的旗艦推理款，主攻複雜 coding、研究、科學與知識工作，並提升每個 token 的工作產出。",
    availability: "ChatGPT / Codex / API",
    sourceUrl: "https://openai.com/index/gpt-5-6/",
  },
  {
    provider: "OpenAI",
    name: "GPT-5.6 Terra",
    apiId: "gpt-5.6-terra",
    releasedAt: "2026-07-09",
    brief: "GPT-5.6 的平衡款，以較低成本提供接近 GPT-5.5 的能力，適合一般工作與大量日常任務。",
    availability: "ChatGPT / Codex / API",
    sourceUrl: "https://openai.com/index/gpt-5-6/",
  },
  {
    provider: "OpenAI",
    name: "GPT-5.6 Luna",
    apiId: "gpt-5.6-luna",
    releasedAt: "2026-07-09",
    brief: "GPT-5.6 家族中最快、最便宜的版本，鎖定成本敏感與高流量工作負載。",
    availability: "ChatGPT / Codex / API",
    sourceUrl: "https://openai.com/index/gpt-5-6/",
  },
  {
    provider: "OpenAI",
    name: "GPT-Live-1",
    apiId: null,
    releasedAt: "2026-07-08",
    brief: "新一代全雙工語音模型，可以同時聽與說、自然處理插話，遇到複雜問題還能在背景委派搜尋與推理。",
    availability: "ChatGPT Voice；API 尚未開放",
    sourceUrl: "https://openai.com/index/introducing-gpt-live/",
  },
  {
    provider: "OpenAI",
    name: "GPT-Live-1 mini",
    apiId: null,
    releasedAt: "2026-07-08",
    brief: "GPT-Live 的輕量版本，同樣支援自然插話與全雙工對話，現階段主要供 ChatGPT 免費方案使用。",
    availability: "ChatGPT Voice；API 尚未開放",
    sourceUrl: "https://openai.com/index/introducing-gpt-live/",
  },
  {
    provider: "xAI",
    name: "Grok 4.6",
    apiId: null,
    releasedAt: "2026-08-12",
    brief: "Grok 4.5 的後繼旗艦模型，強化長時間自主完成 coding、工程、辦公與 AI 研究工作的能力，並用更少步驟與輸出 token 完成更難的任務。",
    availability: "xAI API / Grok Build / Cursor / Office add-ins / model gateways",
    sourceUrl: "https://media.x.ai/v1/website/card-4p6-4cd2dc57.pdf",
  },
  {
    provider: "xAI",
    name: "Grok 4.5",
    apiId: "grok-4.5",
    releasedAt: "2026-07-08",
    brief: "針對 coding、agent 任務與知識工作推出的新模型，API 可調整 low、medium、high 三種推理強度。",
    availability: "xAI API",
    sourceUrl: "https://docs.x.ai/developers/release-notes",
  },
];

interface GeneratedReleases {
  models?: ModelReleaseItem[];
}

export function currentReleaseMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

export function releaseMonthLabel(month: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "long",
  }).format(new Date(`${month}-01T00:00:00+08:00`));
}

export function getVerifiedReleasesForMonth(month: string) {
  return sortReleases(
    VERIFIED_RELEASES.filter((item) => item.releasedAt.startsWith(`${month}-`)),
  );
}

function sortReleases(models: ModelReleaseItem[]) {
  return [...models].sort(
    (left, right) => right.releasedAt.localeCompare(left.releasedAt),
  );
}

function isOfficialSource(provider: ModelProvider, url: string) {
  const tracker = TRACKERS.find((item) => item.provider === provider);
  if (!tracker) return false;
  try {
    const host = new URL(url).hostname;
    return tracker.domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

async function scanOfficialReleases(month: string): Promise<ModelReleaseItem[]> {
  const verified = getVerifiedReleasesForMonth(month);
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "long",
  }).format(new Date(`${month}-01T00:00:00+08:00`));

  try {
    const groupedSources = await Promise.all(
      TRACKERS.map(async (tracker) => ({
        tracker,
        sources: await searchTavily(`${tracker.query} ${monthLabel}`, {
          topic: "general",
          searchDepth: "basic",
          maxResults: 4,
          days: 45,
          includeDomains: [...tracker.domains],
        }),
      })),
    );
    const sources = groupedSources.flatMap(({ tracker, sources: rows }) =>
      rows.map((source, index) => ({
        id: `${tracker.provider}-${index + 1}`,
        provider: tracker.provider,
        ...source,
      })),
    );
    if (sources.length === 0 || !process.env.GEMINI_API_KEY) return verified;

    const sourceBlock = sources
      .map(
        (source) =>
          `[${source.id}] provider=${source.provider}\n${source.title}\n${source.content}\nURL: ${source.url}`,
      )
      .join("\n\n");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: `Find every model newly released by Google, xAI, OpenAI, or Anthropic during ${monthLabel}, using only the official excerpts below.

Strict rules:
- Include an actual first public release or a general-availability launch during ${monthLabel}.
- A GA launch counts even if a limited preview happened earlier.
- Include specialized models such as voice, image, or coding models when they are genuinely new.
- Exclude feature updates to an older model, documentation changes, deprecations, access restorations, and redeployments.
- releasedAt must be an exact YYYY-MM-DD date explicitly supported by an excerpt. Never infer a date.
- brief must be one concise Traditional Chinese sentence explaining what is genuinely new or different.
- apiId is the official model ID, or an empty string when no API ID is available.
- sourceUrl must exactly match a URL shown below.

Official sources:
${sourceBlock}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            models: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  provider: { type: Type.STRING, enum: PROVIDERS },
                  name: { type: Type.STRING },
                  apiId: { type: Type.STRING },
                  releasedAt: { type: Type.STRING },
                  brief: { type: Type.STRING },
                  availability: { type: Type.STRING },
                  sourceUrl: { type: Type.STRING },
                },
                required: [
                  "provider",
                  "name",
                  "apiId",
                  "releasedAt",
                  "brief",
                  "availability",
                  "sourceUrl",
                ],
              },
            },
          },
          required: ["models"],
        },
      },
    });
    const parsed = JSON.parse(result.text ?? "{}") as GeneratedReleases;
    const valid = (parsed.models ?? [])
      .map((item) => ({ ...item, apiId: item.apiId || null }))
      .filter(
        (item) =>
          item.name &&
          item.brief &&
          /^\d{4}-\d{2}-\d{2}$/.test(item.releasedAt) &&
          item.releasedAt.startsWith(`${month}-`) &&
          isOfficialSource(item.provider, item.sourceUrl),
    );

    const merged = new Map<string, ModelReleaseItem>();
    for (const item of verified) {
      merged.set(`${item.provider}:${item.name}`.toLocaleLowerCase("en-US"), item);
    }
    for (const item of valid) {
      const key = `${item.provider}:${item.name}`.toLocaleLowerCase("en-US");
      if (!merged.has(key)) merged.set(key, item);
    }
    return sortReleases([...merged.values()]);
  } catch {
    return verified;
  }
}

const cachedScanOfficialReleases = unstable_cache(
  scanOfficialReleases,
  ["monthly-model-releases"],
  { revalidate: 86400 },
);

export function getThisMonthModelReleases(month = currentReleaseMonth()) {
  return cachedScanOfficialReleases(month);
}
