"use client";

import { useState } from "react";
import { FormattedAnswer } from "@/components/formatted-answer";
import { SendIcon } from "@/components/icons";
import type { Citation } from "@/lib/types";

interface NewsAskProps {
  pageContext: string;
  theme?: string;
  variant: "feed" | "article";
  placeholder?: string;
}

const SUGGESTIONS: Record<NewsAskProps["variant"], string[]> = {
  feed: ["今天最值得注意的是哪一條？", "台股今天怎麼走？", "AI 領域有什麼新進展？"],
  article: ["這篇文章的重點是什麼？", "對 0050 投資人有什麼影響？", "後續還要注意什麼？"],
};

interface AskMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export function NewsAsk({ pageContext, theme, variant, placeholder }: NewsAskProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMsg = query.trim();
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }, { role: "assistant", content: "" }]);
    setLoading(true);

    try {
      const res = await fetch("/api/news/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg, pageContext, theme }),
      });
      if (!res.ok || !res.body) throw new Error("request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl = buffer.indexOf("\n");
        while (nl !== -1) {
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.trim()) {
            const evt = JSON.parse(line) as
              | { type: "meta"; citations: Citation[] }
              | { type: "token"; text: string }
              | { type: "error"; message: string }
              | { type: "done" };

            if (evt.type === "meta") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], citations: evt.citations };
                return updated;
              });
            } else if (evt.type === "token") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, content: last.content + evt.text };
                return updated;
              });
            } else if (evt.type === "error") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: evt.message };
                return updated;
              });
            }
          }
          nl = buffer.indexOf("\n");
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: "發生錯誤，請稍後再試。" };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  const title = variant === "feed" ? "問問今日新聞" : "追問這篇文章";

  return (
    <section className="mt-12 border-t border-stone-200 pt-10">
      <h2 className="font-serif text-lg text-stone-900">{title}</h2>

      {messages.length > 0 && (
        <div className="mt-8 space-y-6">
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-stone-900 px-4 py-3 text-sm leading-relaxed text-stone-100">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="w-full max-w-none rounded-2xl rounded-bl-sm border border-stone-200/80 bg-white px-5 py-4 shadow-sm">
                  <div className="mb-3 text-[11px] font-medium uppercase tracking-widest text-teal-700" aria-hidden>
                    回答
                  </div>
                  {msg.content ? <FormattedAnswer content={msg.content} /> : loading ? (
                    <p className="text-sm text-stone-400">思考中…</p>
                  ) : null}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {msg.citations.map((c) => (
                        <a
                          key={c.id}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700"
                        >
                          {c.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS[variant].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuery(s)}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6">
        <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm focus-within:border-stone-300 focus-within:ring-2 focus-within:ring-stone-100">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder ?? "想知道什麼？"}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white transition-opacity disabled:opacity-30"
            aria-label="送出"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}
