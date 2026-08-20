import { GoogleGenAI, Type } from "@google/genai";
import { unstable_cache } from "next/cache";
import {
  currentReleaseMonth,
  getThisMonthModelReleases,
  type ModelReleaseItem,
} from "@/lib/model-radar";
import { searchTavily, type TavilySource } from "@/lib/tavily";
import type { Article } from "@/lib/types";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

// Per-theme search seeds. Tavily uses these (topic=news, last few days) to pull
// the source set the model then synthesises into a digest.
const THEME_QUERY: Record<string, string> = {
  "0050": "元大台灣50 0050 ETF 台股 外資 配息 成分股 淨值",
  ai: "人工智慧 AI 大型語言模型 OpenAI Google Gemini xAI Grok Anthropic Claude 最新發布",
  "taiwan-market": "台股 加權指數 法說會 產業輪動 政策 上市櫃 籌碼",
};

// Readable citation labels for common Taiwan finance / tech sources.
const HOST_LABEL: Record<string, string> = {
  "cnyes.com": "鉅亨網",
  "money.udn.com": "經濟日報",
  "udn.com": "聯合新聞網",
  "ctee.com.tw": "工商時報",
  "moneydj.com": "MoneyDJ",
  "cmoney.tw": "CMoney",
  "wantgoo.com": "玩股網",
  "twse.com.tw": "證交所",
  "tw.stock.yahoo.com": "Yahoo 股市",
  "yahoo.com": "Yahoo",
  "bloomberg.com": "Bloomberg",
  "reuters.com": "Reuters",
  "coindesk.com": "CoinDesk",
};

export function hostLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return HOST_LABEL[host] ?? host;
  } catch {
    return url;
  }
}

interface GenSection {
  heading: string;
  paragraphs: string[];
  citationIds: string[];
}

interface GenResult {
  title: string;
  dek: string;
  readMinutes: number;
  sections: GenSection[];
}

export function modelReleaseSources(
  releases: ModelReleaseItem[],
): TavilySource[] {
  return releases.map((release) => ({
    title: `${release.name} 官方發布`,
    content: [
      `${release.provider} 於 ${release.releasedAt} 發布 ${release.name}。`,
      release.brief,
      `使用管道：${release.availability}。`,
      release.apiId ? `官方 API ID：${release.apiId}。` : "",
    ]
      .filter(Boolean)
      .join(" "),
    url: release.sourceUrl,
    publishedDate: release.releasedAt,
  }));
}

export function mergeThemeSources(
  themeSlug: string,
  newsSources: TavilySource[],
  modelReleases: ModelReleaseItem[],
): TavilySource[] {
  if (themeSlug !== "ai") return newsSources;

  // Multiple models often share one family announcement URL. Keep every
  // official release as its own source, then remove only duplicate news rows.
  const releaseSources = modelReleaseSources(modelReleases);
  const releaseUrls = new Set(releaseSources.map((source) => source.url));
  const uniqueNews = new Map<string, TavilySource>();
  for (const source of newsSources) {
    if (!releaseUrls.has(source.url) && !uniqueNews.has(source.url)) {
      uniqueNews.set(source.url, source);
    }
  }
  return [...releaseSources, ...uniqueNews.values()];
}

async function generate(
  themeSlug: string,
  themeName: string,
  themeId: string,
  date: string,
  modelReleases: ModelReleaseItem[],
): Promise<Article | null> {
  const query = THEME_QUERY[themeSlug] ?? themeName;
  const newsSources = await searchTavily(query, {
    topic: "news",
    maxResults: 8,
    days: 3,
  });
  const sources = mergeThemeSources(themeSlug, newsSources, modelReleases);
  if (sources.length === 0) return null;

  const citations = sources.map((s, i) => ({
    id: `c${i + 1}`,
    label: hostLabel(s.url),
    url: s.url,
  }));

  const sourceBlock = sources
    .map(
      (s, i) =>
        `[c${i + 1}] ${s.title}${s.publishedDate ? ` (${s.publishedDate})` : ""}\n${s.content}\n來源：${s.url}`,
    )
    .join("\n\n");

  const modelReleaseRule = themeSlug === "ai" && modelReleases.length > 0
    ? `- 標示為「官方發布」的模型資料優先於一般新聞；標題或導言必須點出最新一筆發布，且每一筆官方模型發布都必須在正文具名提及，不可省略。`
    : "";

  const prompt = `你是專業財經/科技編輯。根據下方今日蒐集到的新聞來源，為「${themeName}」主題撰寫一篇繁體中文每日重點整理（${date}）。

要求：
- 標題（title）：吸睛但精準，不誇大
- 導言（dek）：1-2 句話，60-90 字，總結今日重點
- 分 3-5 個段落區塊（sections），每塊有小標題（heading）與 1-2 段內文（paragraphs，每段 80-150 字）
- 內容只能根據提供的來源，不可捏造數據或事件
- 每個段落區塊用 citationIds 標註引用了哪些來源（例如 ["c1","c3"]），只能引用下方出現的 id
- readMinutes：估算閱讀分鐘數（整數）
- 用詞客觀中立，避免投資建議與保證性字眼
${modelReleaseRule}

【今日來源】
${sourceBlock}`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const result = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          dek: { type: Type.STRING },
          readMinutes: { type: Type.NUMBER },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                heading: { type: Type.STRING },
                paragraphs: { type: Type.ARRAY, items: { type: Type.STRING } },
                citationIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["heading", "paragraphs", "citationIds"],
            },
          },
        },
        required: ["title", "dek", "readMinutes", "sections"],
      },
    },
  });

  let parsed: GenResult;
  try {
    parsed = JSON.parse(result.text ?? "{}") as GenResult;
  } catch {
    return null;
  }
  if (!parsed.title || !parsed.sections?.length) return null;

  const validIds = new Set(citations.map((c) => c.id));

  return {
    id: `${themeSlug}-${date}`,
    themeId,
    slug: `${themeSlug}-${date}`,
    title: parsed.title,
    dek: parsed.dek ?? "",
    publishedAt: `${date}T07:00:00+08:00`,
    readMinutes: Math.max(1, Math.round(parsed.readMinutes || 3)),
    sourceCount: sources.length,
    sections: parsed.sections.map((s, i) => ({
      id: `s${i + 1}`,
      heading: s.heading,
      paragraphs: s.paragraphs ?? [],
      citationIds: (s.citationIds ?? []).filter((id) => validIds.has(id)),
    })),
    citations,
    relatedSlugs: [],
  };
}

// One digest per theme per day, cached for 24h. Cache key includes the theme
// slug + date (args participate in the unstable_cache key, same pattern as
// outlook-data's cachedHorizons).
const cachedGenerate = unstable_cache(generate, ["news-article"], {
  revalidate: 86400,
});

export function generateThemeArticle(
  theme: { slug: string; name: string; id: string },
  date: string,
): Promise<Article | null> {
  if (theme.slug !== "ai") {
    return cachedGenerate(theme.slug, theme.name, theme.id, date, []);
  }

  const month = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date.slice(0, 7)
    : currentReleaseMonth();
  return getThisMonthModelReleases(month).then((releases) =>
    cachedGenerate(
      theme.slug,
      theme.name,
      theme.id,
      date,
      releases.filter((release) => release.releasedAt <= date),
    ),
  );
}
