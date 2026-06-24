"use client";

import { useEffect, useRef, useState } from "react";
import { FormattedAnswer } from "@/components/formatted-answer";
import { SendIcon } from "@/components/icons";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { parseSseStream } from "@/lib/parse-sse";
import type { ChatMessage, ChatSessionSummary, RawHermesMessage } from "@/lib/chat-types";

const SUGGESTIONS = ["今天有什麼新聞值得關注？", "幫我規劃明天的待辦事項", "隨便聊聊"];

export function ChatApp() {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    refreshSessions();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function refreshSessions() {
    try {
      const res = await fetch("/api/chat/sessions");
      const body = await res.json();
      if (res.ok) setSessions(body.sessions ?? []);
    } catch {
      // sidebar will simply stay empty; not worth surfacing to the user
    }
  }

  async function selectSession(id: string) {
    setActiveSessionId(id);
    setMessages([]);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/messages?id=${encodeURIComponent(id)}`);
      const body = await res.json();
      if (res.ok) {
        setMessages(
          (body.messages as RawHermesMessage[] ?? [])
            .filter((m): m is RawHermesMessage & { role: "user" | "assistant" } =>
              m.role === "user" || m.role === "assistant",
            )
            .map((m) => ({ id: m.id, role: m.role, content: m.content ?? "" })),
        );
      }
    } finally {
      setLoadingMessages(false);
    }
  }

  function startNewChat() {
    setActiveSessionId(null);
    setMessages([]);
    setInput("");
  }

  async function renameSession(id: string, title: string) {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
    await fetch("/api/chat/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    });
  }

  async function deleteSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === activeSessionId) startNewChat();
    await fetch("/api/chat/session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function sendMessage(text: string) {
    const userText = text.trim();
    if (!userText || sending) return;

    setSending(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userText }, { role: "assistant", content: "" }]);

    try {
      let sessionId = activeSessionId;
      if (!sessionId) {
        const res = await fetch("/api/chat/sessions", { method: "POST", body: JSON.stringify({}) });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "建立對話失敗");
        sessionId = body.session.id;
        setActiveSessionId(sessionId);
        setSessions((prev) => [body.session, ...prev]);

        const autoTitle = generateAutoTitle(userText);
        if (autoTitle) {
          setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: autoTitle } : s)));
          void fetch("/api/chat/session", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: sessionId, title: autoTitle }),
          });
        }
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, message: userText }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "傳送訊息失敗");
      }

      for await (const { event, data } of parseSseStream(res.body)) {
        if (event === "assistant.delta") {
          appendToLastAssistant((data as { delta?: string }).delta ?? "");
        } else if (event === "assistant.completed") {
          setLastAssistantContent((data as { content?: string }).content ?? "");
        } else if (event === "error") {
          setLastAssistantContent((data as { message?: string }).message ?? "發生錯誤，請稍後再試。");
        }
      }

      refreshSessions();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        appendToLastAssistant("\n\n（已停止生成）");
        return;
      }
      setLastAssistantContent(err instanceof Error ? err.message : "發生錯誤，請稍後再試。");
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  }

  function stopGenerating() {
    abortRef.current?.abort();
  }

  function generateAutoTitle(text: string): string {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    return normalized.length > 20 ? `${normalized.slice(0, 20)}…` : normalized;
  }

  function appendToLastAssistant(delta: string) {
    if (!delta) return;
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      updated[updated.length - 1] = { ...last, content: last.content + delta };
      return updated;
    });
  }

  function setLastAssistantContent(content: string) {
    setMessages((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], content };
      return updated;
    });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={selectSession}
        onNew={startNewChat}
        onRename={renameSession}
        onDelete={deleteSession}
      />

      <main className="flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 lg:px-10">
          <div className="mx-auto w-full max-w-2xl">
            {messages.length === 0 && !loadingMessages ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                <h1 className="font-serif text-2xl text-stone-900">今天想聊什麼？</h1>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMessage(s)}
                      className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, i) =>
                  msg.role === "user" ? (
                    <div key={msg.id ?? i} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-stone-900 px-4 py-3 text-sm leading-relaxed text-stone-100">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id ?? i} className="flex justify-start">
                      <div className="w-full max-w-none rounded-2xl rounded-bl-sm border border-stone-200/80 bg-white px-5 py-4 shadow-sm">
                        {msg.content ? (
                          <FormattedAnswer content={msg.content} />
                        ) : (
                          <p className="text-sm text-stone-400">思考中…</p>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-stone-200 bg-white px-4 py-4 lg:px-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="mx-auto w-full max-w-2xl"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm focus-within:border-stone-300 focus-within:ring-2 focus-within:ring-stone-100">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="輸入訊息…"
                disabled={sending}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white transition-opacity disabled:opacity-30"
                aria-label="送出"
              >
                <SendIcon className="h-4 w-4" />
              </button>
              {sending && (
                <button
                  type="button"
                  onClick={stopGenerating}
                  className="rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-600 hover:bg-stone-50"
                >
                  停止生成
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
