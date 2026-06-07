"use client";

import { useCallback, useEffect, useState } from "react";
import type { PositionData } from "@/lib/types";

const STORAGE_KEY = "0050-position-v1";
const POLL_MS = 10 * 60 * 1000;

interface Quote {
  price: number;
}

function readPosition(): PositionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.shares === "number" && typeof p.avgCost === "number") return p;
    return null;
  } catch {
    return null;
  }
}

export function MyPosition() {
  const [position, setPosition] = useState<PositionData | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftShares, setDraftShares] = useState("");
  const [draftCost, setDraftCost] = useState("");

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch("/api/quote/0050");
      if (!res.ok) return;
      const q: Quote = await res.json();
      setPrice(q.price);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setPosition(readPosition());
    fetchPrice();
    const id = setInterval(fetchPrice, POLL_MS);
    return () => clearInterval(id);
  }, [fetchPrice]);

  const startEdit = () => {
    setDraftShares(position ? String(position.shares) : "");
    setDraftCost(position ? String(position.avgCost) : "");
    setEditing(true);
  };

  const save = () => {
    const shares = Number(draftShares);
    const avgCost = Number(draftCost);
    if (
      !Number.isFinite(shares) ||
      shares <= 0 ||
      !Number.isFinite(avgCost) ||
      avgCost <= 0
    ) {
      return;
    }
    const p: PositionData = { shares, avgCost };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setPosition(p);
    setEditing(false);
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPosition(null);
    setEditing(false);
  };

  let pnl = 0;
  let pnlPct = 0;
  let marketValue = 0;
  let costBasis = 0;
  if (position && price !== null) {
    marketValue = position.shares * price;
    costBasis = position.shares * position.avgCost;
    pnl = marketValue - costBasis;
    pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  }

  const up = pnl >= 0;

  return (
    <div className="mb-6 rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          My Position
        </p>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="text-[11px] text-stone-400 hover:text-stone-600"
          >
            {position ? "編輯" : "+ 新增部位"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <label className="min-w-[120px] flex-1">
              <span className="block text-[11px] text-stone-400">股數</span>
              <input
                type="number"
                value={draftShares}
                onChange={(e) => setDraftShares(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-1 text-sm"
                placeholder="例如 1000"
              />
            </label>
            <label className="min-w-[120px] flex-1">
              <span className="block text-[11px] text-stone-400">平均成本</span>
              <input
                type="number"
                step="0.01"
                value={draftCost}
                onChange={(e) => setDraftCost(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-1 text-sm"
                placeholder="例如 175.50"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded-full bg-stone-900 px-3 py-1 text-xs text-white"
            >
              儲存
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-500"
            >
              取消
            </button>
            {position && (
              <button
                type="button"
                onClick={clear}
                className="ml-auto rounded-full px-3 py-1 text-xs text-red-500 hover:bg-red-50"
              >
                清除部位
              </button>
            )}
          </div>
          <p className="text-[10px] text-stone-400">
            只存在你的瀏覽器（localStorage），不送伺服器
          </p>
        </div>
      ) : !position ? (
        <p className="mt-2 text-sm text-stone-400">
          尚未設定部位。新增後可即時看到未實現損益。
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="持股" value={`${position.shares.toLocaleString()} 股`} />
          <Stat label="平均成本" value={position.avgCost.toFixed(2)} />
          <Stat
            label="市值"
            value={
              price !== null
                ? marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })
                : "—"
            }
          />
          <Stat
            label="未實現損益"
            value={
              price === null
                ? "—"
                : `${up ? "+" : ""}${pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${up ? "+" : ""}${pnlPct.toFixed(2)}%)`
            }
            color={price === null ? undefined : up ? "#0f766e" : "#dc2626"}
          />
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <p className="text-[11px] text-stone-400">{label}</p>
      <p
        className="mt-0.5 font-serif text-lg tracking-tight"
        style={{ color: color ?? "#1c1917" }}
      >
        {value}
      </p>
    </div>
  );
}
