import Link from "next/link";
import { currentEdition } from "@/data/editions";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-[#faf9f7]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/news" className="group flex items-baseline gap-2">
            <span className="font-serif text-xl tracking-tight text-stone-900">
              Christopher Daily
            </span>
            <span className="hidden text-xs text-stone-400 sm:inline">
              {currentEdition.label}
            </span>
          </Link>
          <Link
            href="/todo"
            className="hidden text-xs text-stone-400 transition-colors hover:text-stone-600 sm:inline"
          >
            ← Productivity
          </Link>
        </div>
        <nav className="flex items-center gap-4 text-sm text-stone-500">
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
            Edition #{currentEdition.date.replace(/-/g, "")}
          </span>
        </nav>
      </div>
    </header>
  );
}
