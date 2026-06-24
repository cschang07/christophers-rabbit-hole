import { Suspense } from "react";
import { ArticleCard } from "@/components/article-card";
import { ArticleCardSkeleton } from "@/components/news-skeleton";
import { NewsAsk } from "@/components/news-ask";
import { ThemeSidebar } from "@/components/theme-sidebar";
import { editionDate, editionLabel, themes } from "@/data/editions";
import { generateThemeArticle } from "@/lib/news-gen";
import type { Theme } from "@/lib/types";

const BADGE: Record<string, string> = {
  "0050": "50",
  "worldcup-2026": "WC",
};

function themeBadge(slug: string, name: string) {
  return BADGE[slug] ?? name.slice(0, 2).toUpperCase();
}

// Render per request; each theme streams in via Suspense as its digest finishes
// generating. Must not prerender at build time.
export const dynamic = "force-dynamic";

function ThemeHeading({
  theme,
  count,
}: {
  theme: Theme;
  count: number | null;
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: theme.accent }}
        >
          {themeBadge(theme.slug, theme.name)}
        </span>
        <div>
          <h2 className="font-serif text-xl text-stone-900">{theme.name}</h2>
          <p className="text-xs text-stone-400">{theme.description}</p>
        </div>
      </div>
      <span className="text-xs text-stone-400">
        {count === null ? "整理中…" : `${count} stories`}
      </span>
    </div>
  );
}

function ThemeSectionSkeleton({ theme }: { theme: Theme }) {
  return (
    <section className="mb-12">
      <ThemeHeading theme={theme} count={null} />
      <ArticleCardSkeleton />
    </section>
  );
}

async function ThemeSection({ theme, date }: { theme: Theme; date: string }) {
  const article = await generateThemeArticle(theme, date);
  if (!article) {
    return (
      <section className="mb-12">
        <ThemeHeading theme={theme} count={0} />
        <p className="rounded-2xl border border-dashed border-stone-200 px-5 py-6 text-sm text-stone-400">
          今日尚無 {theme.name} 相關新聞。
        </p>
      </section>
    );
  }
  return (
    <section className="mb-12">
      <ThemeHeading theme={theme} count={1} />
      <div className="space-y-4">
        <ArticleCard article={article} theme={theme} />
      </div>
    </section>
  );
}

// Reuses the same cached generateThemeArticle as ThemeSection above, just to
// read the already-generated title+dek as context for the feed-level Q&A.
async function FeedAsk({ date }: { date: string }) {
  const articles = await Promise.all(themes.map((t) => generateThemeArticle(t, date)));
  const pageContext = themes
    .map((t, i) => {
      const article = articles[i];
      return article ? `【${t.name}】${article.title}\n${article.dek}` : null;
    })
    .filter(Boolean)
    .join("\n\n");
  return <NewsAsk variant="feed" pageContext={pageContext} />;
}

export default function NewsHomePage() {
  const date = editionDate();
  const label = editionLabel(date);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <ThemeSidebar themes={themes} />

        <div className="min-w-0 flex-1">
          <section className="mb-10">
            <p className="text-sm text-stone-400">Today&apos;s edition</p>
            <h1 className="mt-1 font-serif text-3xl tracking-tight text-stone-900 sm:text-4xl">
              Good morning, Christopher.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-500">
              {label} — {themes.length} themes
            </p>
          </section>

          {themes.map((theme) => (
            <Suspense
              key={theme.id}
              fallback={<ThemeSectionSkeleton theme={theme} />}
            >
              <ThemeSection theme={theme} date={date} />
            </Suspense>
          ))}

          <Suspense fallback={null}>
            <FeedAsk date={date} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
