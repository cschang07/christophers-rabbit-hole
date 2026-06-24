"use client";

import Link from "next/link";
import type { Theme } from "@/lib/types";
import { ThemeIcon } from "@/components/icons";

interface ThemeSidebarProps {
  themes: Theme[];
  activeSlug?: string;
}

export function ThemeSidebar({ themes, activeSlug }: ThemeSidebarProps) {
  return (
    <>
      {/* Mobile top bar with home entry */}
      <div className="-mx-4 mb-3 flex items-center justify-between px-4 lg:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900"
        >
          <span className="text-base">☰</span>
          <span>首頁</span>
        </Link>
        <Link
          href="/news"
          className="rounded-lg px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        >
          News
        </Link>
      </div>

      {/* Mobile: horizontal scrolling chip nav */}
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {themes.map((theme) => {
          const isActive = theme.slug === activeSlug;
          return (
            <Link
              key={theme.id}
              href={`/news/theme/${theme.slug}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-stone-900 font-medium text-white"
                  : "bg-white text-stone-600 ring-1 ring-stone-200"
              }`}
            >
              <ThemeIcon name={theme.icon} className="h-3.5 w-3.5" />
              {theme.name}
            </Link>
          );
        })}
      </nav>

      {/* Desktop: vertical sidebar */}
      <aside className="hidden w-52 shrink-0 lg:block">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-stone-500 hover:bg-white hover:text-stone-900"
        >
          <span className="text-base">☰</span>
          <span>Back Home</span>
        </Link>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-stone-400">
          Themes
        </p>
        <ul className="space-y-1">
          {themes.map((theme) => {
            const isActive = theme.slug === activeSlug;
            const isEmpty = theme.status === "empty";

            return (
              <li key={theme.id}>
                <Link
                  href={`/news/theme/${theme.slug}`}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-white font-medium text-stone-900 shadow-sm ring-1 ring-stone-200/80"
                      : "text-stone-600 hover:bg-white/60 hover:text-stone-900"
                  }`}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${theme.accent}18`, color: theme.accent }}
                  >
                    <ThemeIcon name={theme.icon} className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 truncate">{theme.name}</span>
                  {isEmpty && (
                    <span className="text-[10px] text-stone-300">-</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
