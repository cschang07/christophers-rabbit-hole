"use client";

import { useCallback, useEffect, useState } from "react";

interface Quote {
  code: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  updatedAt: string;
}

const POLL_MS = 10 * 60 * 1000;

function formatPrice(n: number) {
  return n.toFixed(2);
}

export function OutlookLivePrice() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch("/api/quote/0050");
      if (!res.ok) throw new Error("quote failed");
      setQuote(await res.json());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuote();
    const id = setInterval(fetchQuote, POLL_MS);
    return () => clearInterval(id);
  }, [fetchQuote]);

  const changeUp = quote ? quote.change >= 0 : true;

  return (
    <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          0050 即時價格
        </p>
        {loading && !quote ? (
          <p className="mt-1 text-sm text-stone-400">載入中…</p>
        ) : error && !quote ? (
          <p className="mt-1 text-sm text-stone-400">無法取得報價</p>
        ) : quote ? (
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="font-serif text-3xl tracking-tight text-stone-900">
              {formatPrice(quote.price)}
            </span>
            <span className="text-sm text-stone-400">TWD</span>
            <span
              className={`text-sm font-medium ${changeUp ? "text-teal-700" : "text-red-600"}`}
            >
              {changeUp ? "+" : ""}
              {formatPrice(quote.change)} ({changeUp ? "+" : ""}
              {quote.changePct.toFixed(2)}%)
            </span>
          </div>
        ) : null}
      </div>
      <p className="text-[11px] text-stone-400">
        {quote ? `更新 ${quote.updatedAt} · 每 10 分鐘刷新` : "每 10 分鐘刷新"}
      </p>
    </div>
  );
}
