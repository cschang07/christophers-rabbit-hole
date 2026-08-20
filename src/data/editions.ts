import { generateThemeArticle } from "@/lib/news-gen";
import type { Article, Edition, Theme } from "@/lib/types";

const TZ = "Asia/Taipei";

// Theme config is static; article content is generated on demand (Tavily +
// Gemini, cached daily) in @/lib/news-gen.
export const themes: Theme[] = [
  {
    id: "theme-0050",
    slug: "0050",
    name: "0050",
    description: "元大台灣50 — 成分股、資金流向、配息與大盤脈動",
    status: "active",
    accent: "#ffd400",
    icon: "chart",
  },
  {
    id: "theme-ai",
    slug: "ai",
    name: "AI",
    description: "模型發布、基礎建設、企業採用",
    status: "active",
    accent: "#67e8f9",
    icon: "spark",
  },
  {
    id: "theme-taiwan",
    slug: "taiwan-market",
    name: "Taiwan Market",
    description: "台股政策、法說、產業輪動",
    status: "active",
    accent: "#f472b6",
    icon: "flag",
  },
];

/** Today's edition date (YYYY-MM-DD) in Asia/Taipei. */
export function editionDate(): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Human label for an edition date, e.g. "Jun 23, 2026". */
export function editionLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00+08:00`));
}

export function getThemeBySlug(slug: string) {
  return themes.find((t) => t.slug === slug);
}

export function getThemeById(id: string) {
  return themes.find((t) => t.id === id);
}

/** Today's generated article(s) for a theme. One digest per theme per day. */
export async function getArticlesByTheme(themeId: string): Promise<Article[]> {
  const theme = themes.find((t) => t.id === themeId);
  if (!theme) return [];
  const article = await generateThemeArticle(theme, editionDate());
  return article ? [article] : [];
}

/** Resolve an article by its `<themeSlug>-<YYYY-MM-DD>` slug. */
export async function getArticleBySlug(
  slug: string,
): Promise<Article | undefined> {
  const m = slug.match(/^(.+)-(\d{4}-\d{2}-\d{2})$/);
  if (!m) return undefined;
  const [, themeSlug, date] = m;
  const theme = themes.find((t) => t.slug === themeSlug);
  if (!theme) return undefined;
  const article = await generateThemeArticle(theme, date);
  return article ?? undefined;
}

/** Assemble today's full edition (all themes + their generated digests). */
export async function getCurrentEdition(): Promise<Edition> {
  const date = editionDate();
  const generated = await Promise.all(
    themes.map((t) => generateThemeArticle(t, date)),
  );
  const articles = generated.filter((a): a is Article => a !== null);
  return { date, label: editionLabel(date), themes, articles };
}
