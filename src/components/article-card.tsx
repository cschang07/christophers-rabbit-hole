import Link from "next/link";
import type { Article, Theme } from "@/lib/types";

interface ArticleCardProps {
  article: Article;
  theme: Theme;
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ArticleCard({ article, theme }: ArticleCardProps) {
  return (
    <Link
      href={`/news/article/${article.slug}`}
      className="group block rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition-all hover:border-stone-300 hover:shadow-md"
    >
      <div className="mb-3 flex items-center gap-2 text-xs text-stone-400">
        <span
          className="rounded-md px-2 py-0.5 font-medium"
          style={{ backgroundColor: `${theme.accent}14`, color: theme.accent }}
        >
          {theme.name}
        </span>
        <span>{formatTime(article.publishedAt)}</span>
        <span>-</span>
        <span>{article.sourceCount} sources</span>
        <span>-</span>
        <span>{article.readMinutes} min</span>
      </div>
      <h3 className="font-serif text-xl leading-snug text-stone-900 group-hover:text-stone-700">
        {article.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-500">
        {article.dek}
      </p>
    </Link>
  );
}
