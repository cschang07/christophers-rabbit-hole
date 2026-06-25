"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePomodoro, fmtTime, type PomodoroPhase } from "@/context/pomodoro";
import { useRecorder, fmtElapsed } from "@/context/recorder";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  match: (pathname: string) => boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "新聞",
    items: [
      { href: "/news", label: "今日新聞", icon: "◈", match: (p) => p.startsWith("/news") },
    ],
  },
  {
    label: "生產力",
    items: [
      { href: "/todo", label: "To-Do", icon: "✓", match: (p) => p === "/todo" || p.startsWith("/todo/") },
      { href: "/board", label: "Board", icon: "▦", match: (p) => p === "/board" || p.startsWith("/board/") },
      { href: "/calendar", label: "Calendar", icon: "▤", match: (p) => p === "/calendar" || p.startsWith("/calendar/") },
      { href: "/notes", label: "Notes", icon: "✎", match: (p) => p === "/notes" || p.startsWith("/notes/") },
      { href: "/pomodoro", label: "Pomodoro", icon: "◷", match: (p) => p === "/pomodoro" || p.startsWith("/pomodoro/") },
      { href: "/game", label: "Break Game", icon: "★", match: (p) => p === "/game" || p.startsWith("/game/") },
    ],
  },
  {
    label: "其他",
    items: [
      { href: "/", label: "Chat", icon: "✦", match: (p) => p === "/" || p.startsWith("/chat") },
    ],
  },
];

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
    <nav className="flex flex-1 flex-col gap-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-widest text-stone-400">
            {group.label}
          </p>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const isActive = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive ? "bg-teal-50 font-medium text-teal-900" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  }`}
                >
                  <span className="w-5 text-center text-xs">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  // The mobile drawer is driven by a native checkbox (the `peer` below) instead
  // of React click state: the browser toggles it on `touchend` natively, which
  // sidesteps iOS Safari's flaky synthetic-click / long-press-selection issues
  // that made a plain <button> handler "open once then go dead". We only reach
  // for JS to force it closed on navigation.
  const toggleRef = useRef<HTMLInputElement>(null);
  const closeDrawer = () => {
    if (toggleRef.current) toggleRef.current.checked = false;
  };

  // Close the drawer whenever the route changes.
  useEffect(() => {
    closeDrawer();
  }, [pathname]);

  return (
    <>
      {/* Native toggle that drives the mobile drawer via CSS `peer-checked:` */}
      <input
        ref={toggleRef}
        id="app-nav-drawer"
        type="checkbox"
        aria-label="選單"
        className="peer sr-only"
      />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-stone-200 bg-white px-4 lg:hidden">
        <label
          htmlFor="app-nav-drawer"
          aria-label="開啟選單"
          className="-ml-1.5 flex h-11 w-11 cursor-pointer touch-manipulation select-none items-center justify-center rounded-lg text-stone-600 transition-colors [-webkit-touch-callout:none] hover:bg-stone-100 active:bg-stone-200"
        >
          <span className="text-xl">☰</span>
        </label>
        <Link
          href="/"
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2"
        >
          <img
            src="/branding/rabbithole-dog-cameo.png"
            alt="Rabbithole logo"
            className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-[#16243f]/10"
          />
          <span className="font-serif text-sm tracking-tight text-teal-800">
            Christopher&apos;s Rabbit Hole
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <MiniRecorder />
          <MiniTimer />
        </div>
      </header>

      {/* Mobile drawer backdrop — a label so tapping it natively closes the toggle.
          Kept in the DOM but inert (pointer-events-none) until open, so it can't
          swallow the very tap that opens the drawer. */}
      <label
        htmlFor="app-nav-drawer"
        aria-hidden="true"
        className="fixed inset-0 z-50 bg-black/35 opacity-0 pointer-events-none transition-opacity duration-200 peer-checked:opacity-100 peer-checked:pointer-events-auto lg:hidden"
      />
      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[80vw] -translate-x-full flex-col overflow-y-auto border-r border-stone-200 bg-white px-3 py-5 pointer-events-none transition-transform duration-200 peer-checked:translate-x-0 peer-checked:pointer-events-auto lg:hidden"
        style={{ height: "100dvh" }}
      >
        <div className="mb-4 flex items-center justify-between px-3">
          <Link href="/" className="font-serif text-sm leading-snug tracking-tight text-teal-800" onClick={closeDrawer}>
            Christopher&apos;s<br />Rabbit Hole
          </Link>
          <label
            htmlFor="app-nav-drawer"
            aria-label="關閉選單"
            className="flex h-9 w-9 cursor-pointer touch-manipulation select-none items-center justify-center rounded-lg text-stone-400 [-webkit-touch-callout:none] hover:bg-stone-100 active:bg-stone-200"
          >
            ✕
          </label>
        </div>
        <SidebarNav pathname={pathname} onNavigate={closeDrawer} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col overflow-y-auto border-r border-stone-200 bg-white px-3 py-5 lg:flex">
        <Link href="/" className="mb-4 px-3 font-serif text-sm leading-snug tracking-tight text-teal-800">
          Christopher&apos;s<br />Rabbit Hole
        </Link>
        <SidebarNav pathname={pathname} />
        <MiniRecorder />
        <MiniTimer />
      </aside>
    </>
  );
}
