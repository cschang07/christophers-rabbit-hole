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
    <aside className="hidden w-52 shrink-0 lg:block">
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
                href={`/theme/${theme.slug}`}
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
  );
}
