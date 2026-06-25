"use client";

import { useEffect, useRef, useState } from "react";
import { FormattedAnswer } from "@/components/formatted-answer";
import { SendIcon } from "@/components/icons";
import { parseSseStream } from "@/lib/parse-sse";
import type { ChatMessage } from "@/lib/chat-types";

export function ChatApp() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

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

        const autoTitle = generateAutoTitle(userText);
        if (autoTitle) {
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
    <main className="mx-auto flex h-full min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col bg-[#f4f1e9] text-[#16243f] lg:max-w-3xl lg:min-h-dvh lg:rounded-3xl lg:border lg:border-[#16243f]/15 lg:bg-[#f8f5ee] lg:shadow-sm">
      <section className="mx-4 mt-3 flex min-h-0 flex-1 flex-col rounded-2xl border border-dashed border-[#16243f]/35 bg-white/60 p-3 lg:mx-8 lg:mb-8">
        <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-xl border border-dashed border-[#16243f]/25 bg-white/70 p-3">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
              <div className="relative h-24 w-24">
                <svg viewBox="0 0 360 360" className="h-24 w-24">
                  <circle cx="180" cy="180" r="178" fill="#16243f" />
                  <circle cx="180" cy="180" r="169" fill="none" stroke="#ECE6D8" strokeWidth="1.5" opacity="0.5" />
                  <circle cx="180" cy="180" r="122" fill="#ECE6D8" />
                </svg>
                <img
                  src="/branding/rabbithole-dog-cameo.png"
                  alt="Rabbithole primary logo"
                  className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover"
                />
              </div>
              <p className="font-serif text-2xl tracking-tight">Ask Rabbithole</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) =>
                msg.role === "user" ? (
                  <div key={msg.id ?? i} className="flex justify-end">
                    <div className="max-w-[90%] rounded-2xl rounded-br-sm bg-[#16243f] px-4 py-3 text-sm leading-relaxed text-[#f6f1e7]">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id ?? i} className="flex justify-start">
                    <div className="w-full max-w-none rounded-2xl rounded-bl-sm border border-[#16243f]/20 bg-white px-4 py-3 shadow-sm">
                      {msg.content ? <FormattedAnswer content={msg.content} /> : <p className="text-sm text-[#16243f]/55">思考中…</p>}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        <div className="pt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <div className="flex flex-1 items-center gap-2 rounded-full border border-[#16243f]/30 bg-white px-3 py-2.5 shadow-sm">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Input box"
                disabled={sending}
                className="flex-1 bg-transparent text-base text-[#16243f] placeholder:text-[#16243f]/45 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#16243f] text-white transition-opacity disabled:opacity-30"
                aria-label="送出"
              >
                <SendIcon className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={stopGenerating}
              disabled={!sending}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#16243f]/35 bg-white text-sm font-semibold text-[#16243f] disabled:opacity-40"
              aria-label="停止生成"
            >
              ⏹
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
