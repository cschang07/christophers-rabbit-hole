import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/article-card";
import { EmptyThemePanel } from "@/components/empty-theme";
import { ArrowLeftIcon } from "@/components/icons";
import { OutlookCharts } from "@/components/outlook-charts";
import { OutlookLivePrice } from "@/components/outlook-live-price";
import { OutlookStrip } from "@/components/outlook-strip";
import { ThemeSidebar } from "@/components/theme-sidebar";
import {
  currentEdition,
  getArticlesByTheme,
  getThemeBySlug,
} from "@/data/editions";
import { fetchOutlookData } from "@/lib/outlook-data";

interface ThemePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ThemePage({ params }: ThemePageProps) {
  const { slug } = await params;
  const theme = getThemeBySlug(slug);
  if (!theme) notFound();

  const articles = getArticlesByTheme(theme.id);
  const outlookData = slug === "0050" ? await fetchOutlookData() : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex gap-10">
        <ThemeSidebar themes={currentEdition.themes} activeSlug={slug} />

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
                {theme.name.slice(0, 2)}
              </span>
              <div>
                <h1 className="font-serif text-2xl text-stone-900">{theme.name}</h1>
                <p className="text-sm text-stone-400">{theme.description}</p>
              </div>
            </div>
          </header>

          {theme.status === "empty" ? (
            <EmptyThemePanel theme={theme} />
          ) : (
            <>
              {slug === "0050" && outlookData && (
                <>
                  <OutlookLivePrice />
                  <OutlookStrip data={outlookData} />
                  <OutlookCharts data={outlookData} />
                </>
              )}
              <div className="space-y-4">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} theme={theme} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
