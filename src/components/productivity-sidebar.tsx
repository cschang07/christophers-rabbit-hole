"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function ProductivitySidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-52 shrink-0 flex-col border-r border-stone-200 bg-white px-3 py-5">
      <Link href="/todo" className="mb-6 px-3 font-serif text-lg tracking-tight text-teal-800">
        Productivity
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const isActive =
            item.href === "/news"
              ? pathname.startsWith("/news")
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive ? "bg-teal-50 font-medium text-teal-900" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }`}>
              <span className="w-5 text-center text-xs">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <MiniRecorder />
      <MiniTimer />
    </aside>
  );
}
