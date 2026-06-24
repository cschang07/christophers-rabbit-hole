import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleCard } from "@/components/article-card";
import { EmptyThemePanel } from "@/components/empty-theme";
import { HoldingsCard } from "@/components/holdings-card";
import { ArrowLeftIcon } from "@/components/icons";
import { MyPosition } from "@/components/my-position";
import {
  ArticleListSkeleton,
  OutlookSkeleton,
} from "@/components/news-skeleton";
import { OutlookCharts } from "@/components/outlook-charts";
import { OutlookLivePrice } from "@/components/outlook-live-price";
import { OutlookStrip } from "@/components/outlook-strip";
import { ThemeSidebar } from "@/components/theme-sidebar";
import { YieldCard } from "@/components/yield-card";
import {
  getArticlesByTheme,
  getThemeBySlug,
  themes,
} from "@/data/editions";
import { fetchYieldData } from "@/lib/dividend-data";
import { fetchOutlookData } from "@/lib/outlook-data";
import type { Theme } from "@/lib/types";

const BADGE: Record<string, string> = {
  "0050": "50",
  "worldcup-2026": "WC",
};

function themeBadge(slug: string, name: string) {
  return BADGE[slug] ?? name.slice(0, 2).toUpperCase();
}

// Streams independently of the article digest below.
async function OutlookBlock() {
  const outlookData = await fetchOutlookData();
  const lastPrice =
    outlookData.priceSeries[outlookData.priceSeries.length - 1]?.price ?? 0;
  const yieldData = await fetchYieldData(lastPrice);

  return (
    <>
      <OutlookLivePrice />
      <MyPosition />
      <OutlookStrip data={outlookData} />
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <HoldingsCard />
        <YieldCard data={yieldData} />
      </div>
      <OutlookCharts data={outlookData} />
    </>
  );
}

async function ThemeArticles({ theme }: { theme: Theme }) {
  const articles = await getArticlesByTheme(theme.id);
  if (articles.length === 0) {
    return theme.slug === "0050" ? null : <EmptyThemePanel theme={theme} />;
  }
  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} theme={theme} />
      ))}
    </div>
  );
}

interface ThemePageProps {
  params: Promise<{ slug: string }>;
}

// Render per request; outlook + digest stream in via Suspense.
export const dynamic = "force-dynamic";

export default async function ThemePage({ params }: ThemePageProps) {
  const { slug } = await params;
  const theme = getThemeBySlug(slug);
  if (!theme) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <ThemeSidebar themes={themes} activeSlug={slug} />

        <div className="min-w-0 flex-1">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-stone-600"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Discover
          </Link>

          <header className="mb-8">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: theme.accent }}
              >
                {themeBadge(theme.slug, theme.name)}
              </span>
              <div>
                <h1 className="font-serif text-2xl text-stone-900">{theme.name}</h1>
                <p className="text-sm text-stone-400">{theme.description}</p>
              </div>
            </div>
          </header>

          {slug === "0050" && (
            <Suspense fallback={<OutlookSkeleton />}>
              <OutlookBlock />
            </Suspense>
          )}

          <Suspense fallback={<ArticleListSkeleton />}>
            <ThemeArticles theme={theme} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
