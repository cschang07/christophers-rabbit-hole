"use client";

import { useState } from "react";
import { FormattedAnswer } from "@/components/formatted-answer";
import { SendIcon } from "@/components/icons";

interface AskPanelProps {
  articleTitle: string;
  articleContext: string;
}

const SUGGESTIONS = [
  "外資賣超 0050 的歷史規模如何？",
  "台積電權重對淨值影響有多大？",
  "0050 和 0056 該怎麼搭配？",
];

export function AskPanel({ articleTitle, articleContext }: AskPanelProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMsg = query.trim();
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg, articleContext }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "發生錯誤，請稍後再試。",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  const titlePreview =
    articleTitle.length > 30 ? `${articleTitle.slice(0, 30)}…` : articleTitle;

  return (
    <section className="mt-12 border-t border-stone-200 pt-10">
      <h2 className="font-serif text-lg text-stone-900">追問這篇文章</h2>
      <p className="mt-1 text-sm text-stone-400">
        針對「{titlePreview}」的內容與來源繼續提問
      </p>

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
                  <div
                    className="mb-3 text-[11px] font-medium uppercase tracking-widest text-teal-700"
                    aria-hidden
                  >
                    回答
                  </div>
                  {msg.content ? (
                    <FormattedAnswer content={msg.content} />
                  ) : loading ? (
                    <p className="text-sm text-stone-400">思考中…</p>
                  ) : null}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
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
            placeholder="關於這篇文章，你想知道什麼？"
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
