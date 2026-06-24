import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";
import { NewsAsk } from "@/components/news-ask";
import { getArticleBySlug, getThemeById } from "@/data/editions";
import type { Citation } from "@/lib/types";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function CitationPills({
  ids,
  citations,
}: {
  ids: string[];
  citations: Citation[];
}) {
  const matched = ids
    .map((id) => citations.find((c) => c.id === id))
    .filter(Boolean) as Citation[];

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {matched.map((c) => (
        <a
          key={c.id}
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700"
        >
          {c.label}
        </a>
      ))}
    </div>
  );
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const theme = getThemeById(article.themeId)!;
  const related = (
    await Promise.all(article.relatedSlugs.map((s) => getArticleBySlug(s)))
  ).filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href={`/news/theme/${theme.slug}`}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-stone-600"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to {theme.name}
      </Link>

      <article>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-stone-400">
          <span
            className="rounded-md px-2 py-0.5 font-medium"
            style={{ backgroundColor: `${theme.accent}14`, color: theme.accent }}
          >
            {theme.name}
          </span>
          <span>{formatDate(article.publishedAt)}</span>
          <span>-</span>
          <span>{article.sourceCount} sources</span>
          <span>-</span>
          <span>{article.readMinutes} min read</span>
        </div>

        <h1 className="font-serif text-3xl leading-tight tracking-tight text-stone-900 sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-stone-500">{article.dek}</p>

        <div className="mt-10 space-y-10">
          {article.sections.map((section) => (
            <section key={section.id}>
              <h2 className="font-serif text-xl text-stone-900">{section.heading}</h2>
              <div className="mt-3 space-y-4">
                {section.paragraphs.map((p, i) => (
                  <p key={i} className="text-[15px] leading-[1.75] text-stone-700">
                    {p}
                  </p>
                ))}
              </div>
              <CitationPills ids={section.citationIds} citations={article.citations} />
            </section>
          ))}
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-12 border-t border-stone-200 pt-10">
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
            Discover more
          </h2>
          <ul className="mt-4 space-y-3">
            {related.map((rel) => (
              <li key={rel!.id}>
                <Link
                  href={`/news/article/${rel!.slug}`}
                  className="text-sm text-stone-600 underline decoration-stone-300 underline-offset-2 transition-colors hover:text-stone-900 hover:decoration-stone-500"
                >
                  {rel!.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <NewsAsk
        variant="article"
        theme={theme.slug}
        pageContext={[
          article.title,
          article.dek,
          ...article.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
        ].join("\n\n")}
        placeholder={`關於「${article.title.length > 20 ? `${article.title.slice(0, 20)}…` : article.title}」，你想知道什麼？`}
      />
    </div>
  );
}
