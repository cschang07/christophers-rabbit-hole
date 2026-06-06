import { ArticleCard } from "@/components/article-card";
import { EmptyThemeCard } from "@/components/empty-theme";
import { ThemeSidebar } from "@/components/theme-sidebar";
import { currentEdition } from "@/data/editions";

export default function HomePage() {
  const activeTheme = currentEdition.themes.find((t) => t.status === "active")!;
  const emptyThemes = currentEdition.themes.filter((t) => t.status === "empty");
  const articles = currentEdition.articles.filter(
    (a) => a.themeId === activeTheme.id,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex gap-10">
        <ThemeSidebar themes={currentEdition.themes} />

        <div className="min-w-0 flex-1">
          <section className="mb-10">
            <p className="text-sm text-stone-400">Today&apos;s edition</p>
            <h1 className="mt-1 font-serif text-3xl tracking-tight text-stone-900 sm:text-4xl">
              Good morning, Christopher.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-500">
              {currentEdition.label} — 1 active theme, {emptyThemes.length} placeholders
            </p>
          </section>

          <section className="mb-12">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: activeTheme.accent }}
                >
                  50
                </span>
                <div>
                  <h2 className="font-serif text-xl text-stone-900">{activeTheme.name}</h2>
                  <p className="text-xs text-stone-400">{activeTheme.description}</p>
                </div>
              </div>
              <span className="text-xs text-stone-400">{articles.length} stories</span>
            </div>

            <div className="space-y-4">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} theme={activeTheme} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-5 text-[11px] font-medium uppercase tracking-widest text-stone-400">
              Upcoming themes
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {emptyThemes.map((theme) => (
                <EmptyThemeCard key={theme.id} theme={theme} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
