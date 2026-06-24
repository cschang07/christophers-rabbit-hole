"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logout } from "@/app/login/actions";
import { sessionLabel, type ChatSessionSummary } from "@/lib/chat-types";

interface ChatSidebarProps {
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

function SessionRow({
  session,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  session: ChatSessionSummary;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const title = draft.trim();
          if (title) onRename(title);
          setEditing(false);
        }}
        className="px-3 py-1"
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-200"
        />
      </form>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        isActive ? "bg-teal-50 font-medium text-teal-900" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
      }`}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left">
        {sessionLabel(session)}
      </button>
      <button
        type="button"
        aria-label="重新命名"
        onClick={() => {
          setDraft(sessionLabel(session) === "新對話" ? "" : sessionLabel(session));
          setEditing(true);
        }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-stone-400 opacity-0 hover:bg-stone-200 hover:text-stone-700 group-hover:opacity-100"
      >
        ✎
      </button>
      <button
        type="button"
        aria-label="刪除對話"
        onClick={() => {
          if (window.confirm("刪除這個對話？此操作無法復原。")) onDelete();
        }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-stone-400 opacity-0 hover:bg-stone-200 hover:text-rose-600 group-hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

function SidebarBody({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: ChatSidebarProps) {
  return (
    <>
      <button
        type="button"
        onClick={onNew}
        className="mb-3 flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50"
      >
        <span className="text-base leading-none">+</span> 新對話
      </button>

      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {sessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            onSelect={() => onSelect(session.id)}
            onRename={(title) => onRename(session.id, title)}
            onDelete={() => onDelete(session.id)}
          />
        ))}
        {sessions.length === 0 && (
          <p className="px-3 py-2 text-xs text-stone-400">還沒有對話紀錄</p>
        )}
      </nav>

      <div className="mt-3 space-y-0.5 border-t border-stone-200 pt-3">
        <Link
          href="/todo"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900"
        >
          <span className="w-5 text-center text-xs">✓</span> To-Do
        </Link>
        <Link
          href="/news"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900"
        >
          <span className="w-5 text-center text-xs">◈</span> News
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-900"
          >
            <span className="w-5 text-center text-xs">⎋</span> 登出
          </button>
        </form>
      </div>
    </>
  );
}

export function ChatSidebar(props: ChatSidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [props.activeSessionId]);

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
        <span className="font-serif text-sm tracking-tight text-teal-800">
          Christopher&apos;s Rabbit Hole
        </span>
      </header>

      {/* Mobile drawer + backdrop */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 lg:hidden" onClick={() => setDrawerOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[80vw] flex-col border-r border-stone-200 bg-white px-3 py-5 transition-transform duration-200 lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ height: "100dvh" }}
      >
        <div className="mb-4 flex items-center justify-between px-3">
          <span className="font-serif text-sm leading-snug tracking-tight text-teal-800">
            Christopher&apos;s<br />Rabbit Hole
          </span>
          <button
            type="button"
            aria-label="關閉選單"
            onClick={() => setDrawerOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100"
          >
            ✕
          </button>
        </div>
        <SidebarBody {...props} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-stone-200 bg-white px-3 py-5 lg:flex">
        <span className="mb-4 px-3 font-serif text-sm leading-snug tracking-tight text-teal-800">
          Christopher&apos;s<br />Rabbit Hole
        </span>
        <SidebarBody {...props} />
      </aside>
    </>
  );
}
