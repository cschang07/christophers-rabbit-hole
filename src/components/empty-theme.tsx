import Link from "next/link";
import type { Theme } from "@/lib/types";
import { ThemeIcon } from "@/components/icons";

interface EmptyThemeProps {
  theme: Theme;
}

export function EmptyThemeCard({ theme }: EmptyThemeProps) {
  return (
    <Link
      href={`/news/theme/${theme.slug}`}
      className="flex flex-col rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-5 transition-colors hover:border-stone-300 hover:bg-stone-50"
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${theme.accent}12`, color: theme.accent }}
        >
          <ThemeIcon name={theme.icon} className="h-5 w-5 opacity-50" />
        </span>
        <div>
          <h3 className="font-medium text-stone-400">{theme.name}</h3>
          <p className="text-xs text-stone-300">{theme.description}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-2">
        <div className="h-2.5 w-3/4 rounded bg-stone-200/60" />
        <div className="h-2.5 w-full rounded bg-stone-200/40" />
        <div className="h-2.5 w-5/6 rounded bg-stone-200/30" />
        <p className="mt-3 text-xs text-stone-300">{"\u5c1a\u672a\u555f\u7528 \u2014 \u9810\u89bd\u6392\u7248"}</p>
      </div>
    </Link>
  );
}

export function EmptyThemePanel({ theme }: EmptyThemeProps) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/40 px-8 py-16 text-center">
      <span
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${theme.accent}10`, color: theme.accent }}
      >
        <ThemeIcon name={theme.icon} className="h-7 w-7 opacity-40" />
      </span>
      <h2 className="font-serif text-2xl text-stone-400">{theme.name}</h2>
      <p className="mt-2 max-w-sm text-sm text-stone-400">{theme.description}</p>
      <p className="mt-6 rounded-full bg-stone-100 px-4 py-1.5 text-xs text-stone-400">
        {"\u6b64\u4e3b\u984c\u5c1a\u672a\u555f\u7528\uff0c\u50c5\u4f9b\u7248\u9762\u9810\u89bd"}
      </p>
      <div className="mt-10 w-full max-w-md space-y-3">
        <div className="h-3 rounded-full bg-stone-200/50" />
        <div className="h-3 rounded-full bg-stone-200/40" />
        <div className="h-3 rounded-full bg-stone-200/30" />
        <div className="h-24 rounded-xl bg-stone-200/20" />
      </div>
    </div>
  );
}
