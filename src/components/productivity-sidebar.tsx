"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { usePomodoro, fmtTime, type PomodoroPhase } from "@/context/pomodoro";
import { useRecorder, fmtElapsed } from "@/context/recorder";

const NAV = [
  { href: "/todo", label: "To-Do", icon: "✓" },
  { href: "/board", label: "Board", icon: "▦" },
  { href: "/calendar", label: "Calendar", icon: "▤" },
  { href: "/notes", label: "Notes", icon: "✎" },
  { href: "/pomodoro", label: "Pomodoro", icon: "◷" },
  { href: "/game", label: "Break Game", icon: "★" },
  { href: "/news", label: "News", icon: "◈" },
] as const;

const PHASE_SHORT: Record<PomodoroPhase, string> = { work: "Focus", shortBreak: "Short Break", longBreak: "Long Break" };

function MiniTimer() {
  const { phase, running, secondsLeft } = usePomodoro();
  if (!running) return null;
  return (
    <Link href="/pomodoro" className={`mini-timer ${phase}`}>
      {fmtTime(secondsLeft)}
      <span className="mini-timer-phase">{PHASE_SHORT[phase]}</span>
    </Link>
  );
}

function MiniRecorder() {
  const { status, elapsed } = useRecorder();
  if (status !== "recording") return null;
  return (
    <Link href="/notes" className="mini-recorder">
      <span className="rec-dot" /> {fmtElapsed(elapsed)}
    </Link>
  );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => {
        const isActive =
          item.href === "/news"
            ? pathname.startsWith("/news")
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              isActive ? "bg-teal-50 font-medium text-teal-900" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            }`}>
            <span className="w-5 text-center text-xs">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ProductivitySidebar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-stone-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          aria-label="開啟選單"
          onClick={() => setDrawerOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
        >
          <span className="text-lg">☰</span>
        </button>
        <Link href="/todo" className="font-serif text-sm tracking-tight text-teal-800">
          Christopher&apos;s Rabbit Hole
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <MiniRecorder />
          <MiniTimer />
        </div>
      </header>

      {/* Mobile drawer + backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/35 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[80vw] flex-col border-r border-stone-200 bg-white px-3 py-5 transition-transform duration-200 lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ height: "100dvh" }}
      >
        <div className="mb-4 flex items-center justify-between px-3">
          <Link href="/todo" className="font-serif text-sm leading-snug tracking-tight text-teal-800" onClick={() => setDrawerOpen(false)}>
            Christopher&apos;s<br />Rabbit Hole
          </Link>
          <button
            type="button"
            aria-label="關閉選單"
            onClick={() => setDrawerOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100"
          >
            ✕
          </button>
        </div>
        <SidebarNav pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col border-r border-stone-200 bg-white px-3 py-5 lg:flex">
        <Link href="/todo" className="mb-4 px-3 font-serif text-sm leading-snug tracking-tight text-teal-800">
          Christopher&apos;s<br />Rabbit Hole
        </Link>
        <SidebarNav pathname={pathname} />
        <MiniRecorder />
        <MiniTimer />
      </aside>
    </>
  );
}
