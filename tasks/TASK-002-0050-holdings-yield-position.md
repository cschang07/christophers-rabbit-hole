# TASK-002 — 0050 持股權重 + 殖利率 + 個人部位

## 背景

Owner 持有 0050，做完 TASK-001（三檔位 + 圖表）後 CC review 指出三個 ETF 投資人每天必看、目前頁面卻完全空白的資訊：

1. **持股權重** — ETF 本質是一籃子股票，但頁面沒一個地方顯示「裡面是什麼」
2. **殖利率 + 除息日曆** — 配息是大多數人持有 0050 的主因
3. **個人成本基礎 / P&L** — Owner 有實際部位，但即時價對他來說沒有「賺賠」意義

Owner 2026-06-07 確認 go。

---

## 目標

完成後 `/theme/0050` 上 Owner 一眼可以看到：

1. **My Position** — 自己的成本價、現價、未實現損益（TWD + %），純前端 localStorage，按鈕可編輯/清除
2. **Top Holdings** — 0050 前 10 大持股 + 權重 + 產業類別，附資料更新日
3. **Yield Card** — 近 12 月配息總額、年化殖利率、下次預估除息日

不需要登入、不需要後端 DB，部位資料只在 Owner 自己瀏覽器 localStorage。

---

## 已拍板決策（不可更動）

- **D-1**：個人部位**只存 localStorage**，不送伺服器、不要任何登入流程
- **D-2**：持股權重第一版用 **hardcoded JSON**（檔案內標明 `asOf` 日期 + source URL 註解），不抓即時 API。理由：權重變化緩慢（季度級），優先把 UI 做出來，未來 v2 再換動態資料源
- **D-3**：配息用 **FinMind `TaiwanStockDividend`** 動態抓近 4 年配息，server-side cache 24h。失敗時 fallback 到 hardcoded last-4-distributions
- **D-4**：「下次預估除息日」用 hardcoded 常數（檔案內附 source 元大公告連結註解）
- **D-5**：MyPosition、HoldingsCard、YieldCard 三個元件**獨立**，不互相依賴；MyPosition 自己 fetch `/api/quote/0050` 算 P&L（不要 lift state，多一個 HTTP call 沒差）
- **D-6**：版面順序（active 分支內）：
  ```
  [OutlookLivePrice]        ← 既有
  [MyPosition]              ← 新，緊接著 LivePrice
  [OutlookStrip]            ← 既有
  [HoldingsCard | YieldCard] ← 新，並排 2-col grid（sm 以下單欄）
  [OutlookCharts]           ← 既有
  [Articles]                ← 既有
  ```

---

## 協作規則

- **授權狀態：go 已授權**（Owner 2026-06-07 確認）
- 完成後在本檔最底「Implementor 實作備註」記錄 commit hash + 任何超出 spec 的 ad-hoc 改動
- 不確定的 spec → 停下、寫問題到本檔最底、等 CC 回答
- 本次禁止動 TASK-001 已交付的檔案（`outlook-strip.tsx`、`outlook-charts.tsx`、`outlook-live-price.tsx`、`outlook-data.ts`），除非 spec 明確要求

---

## 要改的檔案

| 檔案 | 動作 | 內容 |
|------|------|------|
| `src/lib/types.ts` | 修改 | 新增 `Holding`、`HoldingsData`、`DividendRecord`、`YieldData`、`PositionData` |
| `src/data/holdings-0050.ts` | **新增** | hardcoded `holdings0050: HoldingsData`（top 10 + asOf） |
| `src/data/dividend-fallback.ts` | **新增** | hardcoded last-4 配息 fallback + 下次預估除息日 |
| `src/lib/dividend-data.ts` | **新增** | server-side FinMind 抓配息 + cache 24h + 算年化殖利率，失敗 fallback |
| `src/components/my-position.tsx` | **新增** | client component，localStorage 部位 + P&L |
| `src/components/holdings-card.tsx` | **新增** | server component，顯示 top 10 持股 |
| `src/components/yield-card.tsx` | **新增** | server component，殖利率 + 配息歷史 + 下次除息 |
| `src/app/theme/[slug]/page.tsx` | 修改 | 依 D-6 版面順序串接新元件 |

---

## 精確 Spec

### 1. Types (`src/lib/types.ts` 加在最後)

```ts
export interface Holding {
  rank: number;          // 1–10
  symbol: string;        // "2330"
  name: string;          // "台積電"
  weight: number;        // 百分比，例如 48.5
  sector: string;        // "半導體" / "電子" / "金融" 等
}

export interface HoldingsData {
  asOf: string;          // "2026-Q1"
  source: string;        // "元大投信"
  topHoldings: Holding[];     // 10 筆
  totalWeight: number;       // top 10 合計 %，例如 75.2
}

export interface DividendRecord {
  exDate: string;        // "2025-07-17"
  amount: number;        // 元/股，例如 4.6
  payDate?: string;      // 發放日，可選
}

export interface YieldData {
  asOf: string;
  currentPrice: number;  // 計算殖利率用
  ttmDividend: number;   // 近 12 月配息總額
  annualYield: number;   // % e.g. 3.2
  history: DividendRecord[];  // 近 4 次
  nextExDate: string | null;  // "2026-07-17" 或 null
  nextExNote: string;    // "元大公告日：TBD" 之類
  source: "finmind" | "fallback";
}

export interface PositionData {
  shares: number;
  avgCost: number;       // 平均成本價
}
```

### 2. Hardcoded Holdings (`src/data/holdings-0050.ts`)

```ts
import type { HoldingsData } from "@/lib/types";

// Source: 元大投信官網 https://www.yuantaetfs.com/product/detail/0050/ric
// 注意：權重隨股價波動，數字為近期觀察值的合理估計，請定期更新
export const holdings0050: HoldingsData = {
  asOf: "2026-Q1 (placeholder — 待 v2 接動態資料)",
  source: "元大投信",
  topHoldings: [
    { rank: 1, symbol: "2330", name: "台積電", weight: 49.5, sector: "半導體" },
    { rank: 2, symbol: "2317", name: "鴻海", weight: 5.2, sector: "電子製造" },
    { rank: 3, symbol: "2454", name: "聯發科", weight: 4.1, sector: "半導體" },
    { rank: 4, symbol: "2382", name: "廣達", weight: 3.0, sector: "電子製造" },
    { rank: 5, symbol: "2308", name: "台達電", weight: 2.3, sector: "電子零組件" },
    { rank: 6, symbol: "2881", name: "富邦金", weight: 2.1, sector: "金融" },
    { rank: 7, symbol: "2882", name: "國泰金", weight: 1.9, sector: "金融" },
    { rank: 8, symbol: "2412", name: "中華電", weight: 1.7, sector: "電信" },
    { rank: 9, symbol: "2303", name: "聯電", weight: 1.6, sector: "半導體" },
    { rank: 10, symbol: "2891", name: "中信金", weight: 1.4, sector: "金融" },
  ],
  totalWeight: 72.8,
};
```

### 3. Dividend Fallback (`src/data/dividend-fallback.ts`)

```ts
import type { DividendRecord } from "@/lib/types";

// Source: 元大公告，最後更新 2026-06-07
export const dividend0050Fallback: DividendRecord[] = [
  { exDate: "2025-07-17", amount: 4.6, payDate: "2025-08-08" },
  { exDate: "2025-01-22", amount: 1.0, payDate: "2025-02-18" },
  { exDate: "2024-07-19", amount: 4.6, payDate: "2024-08-09" },
  { exDate: "2024-01-22", amount: 1.0, payDate: "2024-02-18" },
];

// 元大尚未公告，根據歷史慣例 7 月中下旬除息
export const next0050ExDate = {
  date: "2026-07-17",
  note: "歷史慣例推估，元大正式公告日 TBD",
};
```

### 4. Dividend Data Layer (`src/lib/dividend-data.ts`)

```ts
import { unstable_cache } from "next/cache";
import { dividend0050Fallback, next0050ExDate } from "@/data/dividend-fallback";
import type { DividendRecord, YieldData } from "@/lib/types";

const FINMIND = "https://api.finmindtrade.com/api/v4/data";

interface FinMindDividendRow {
  date: string;          // ex date
  stock_id: string;
  CashEarningsDistribution?: number;
  StockEarningsDistribution?: number;
}

async function fetchDividendsRaw(): Promise<DividendRecord[]> {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 4);
  const startStr = start.toISOString().slice(0, 10);
  const url = `${FINMIND}?dataset=TaiwanStockDividend&data_id=0050&start_date=${startStr}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error("finmind dividend failed");
  const json = await res.json();
  const rows: FinMindDividendRow[] = json.data ?? [];
  return rows
    .map((r) => ({
      exDate: r.date,
      amount: Number(r.CashEarningsDistribution ?? 0),
    }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.exDate.localeCompare(a.exDate));
}

const cachedDividends = unstable_cache(
  fetchDividendsRaw,
  ["0050-dividends"],
  { revalidate: 86400 },
);

export async function fetchYieldData(currentPrice: number): Promise<YieldData> {
  let history: DividendRecord[];
  let source: "finmind" | "fallback" = "finmind";
  try {
    history = (await cachedDividends()).slice(0, 4);
    if (history.length === 0) throw new Error("empty");
  } catch {
    history = dividend0050Fallback;
    source = "fallback";
  }

  const now = Date.now();
  const ONE_YEAR_MS = 365 * 24 * 3600 * 1000;
  const ttm = history
    .filter((r) => now - new Date(r.exDate).getTime() < ONE_YEAR_MS)
    .reduce((sum, r) => sum + r.amount, 0);

  const annualYield =
    currentPrice > 0 ? Number(((ttm / currentPrice) * 100).toFixed(2)) : 0;

  return {
    asOf: new Date().toISOString().slice(0, 10),
    currentPrice,
    ttmDividend: Number(ttm.toFixed(2)),
    annualYield,
    history,
    nextExDate: next0050ExDate.date,
    nextExNote: next0050ExDate.note,
    source,
  };
}
```

### 5. My Position (`src/components/my-position.tsx`)

```tsx
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
    } catch {}
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
    if (!Number.isFinite(shares) || shares <= 0 || !Number.isFinite(avgCost) || avgCost <= 0) return;
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

  // P&L computation
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
            <label className="flex-1 min-w-[120px]">
              <span className="block text-[11px] text-stone-400">股數</span>
              <input
                type="number"
                value={draftShares}
                onChange={(e) => setDraftShares(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-1 text-sm"
                placeholder="例如 1000"
              />
            </label>
            <label className="flex-1 min-w-[120px]">
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
            value={price !== null ? marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
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
```

### 6. Holdings Card (`src/components/holdings-card.tsx`)

```tsx
import { holdings0050 } from "@/data/holdings-0050";

const SECTOR_COLOR: Record<string, string> = {
  半導體: "#0f766e",
  電子製造: "#3b82f6",
  電子零組件: "#6366f1",
  金融: "#f59e0b",
  電信: "#a855f7",
};

export function HoldingsCard() {
  const data = holdings0050;
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          前 10 大持股
        </h2>
        <span className="text-[11px] text-stone-400">
          {data.source} · {data.asOf}
        </span>
      </div>

      <ul className="space-y-1.5">
        {data.topHoldings.map((h) => {
          const color = SECTOR_COLOR[h.sector] ?? "#a8a29e";
          return (
            <li key={h.symbol} className="flex items-center gap-3 text-sm">
              <span className="w-4 text-right text-xs text-stone-400">
                {h.rank}
              </span>
              <span className="w-12 font-mono text-xs text-stone-500">
                {h.symbol}
              </span>
              <span className="min-w-0 flex-1 truncate text-stone-800">
                {h.name}
              </span>
              <div className="relative h-1.5 w-24 rounded-full bg-stone-100">
                <div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (h.weight / data.topHoldings[0].weight) * 100)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <span className="w-12 text-right font-mono text-xs text-stone-700">
                {h.weight.toFixed(1)}%
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] text-stone-400">
        Top 10 合計約 {data.totalWeight.toFixed(1)}% · 其餘 40 檔分散
      </p>
    </section>
  );
}
```

### 7. Yield Card (`src/components/yield-card.tsx`)

```tsx
import type { YieldData } from "@/lib/types";

export function YieldCard({ data }: { data: YieldData }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          配息與殖利率
        </h2>
        <span className="text-[11px] text-stone-400">
          {data.source === "finmind" ? "FinMind" : "備援資料"} · {data.asOf}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-stone-400">年化殖利率</p>
          <p className="mt-1 font-serif text-3xl tracking-tight text-stone-900">
            {data.annualYield.toFixed(2)}
            <span className="text-base text-stone-400">%</span>
          </p>
          <p className="mt-1 text-[11px] text-stone-400">
            近 12 月配息 {data.ttmDividend.toFixed(2)} 元 / 現價 {data.currentPrice.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-stone-400">下次預估除息</p>
          <p className="mt-1 font-serif text-xl tracking-tight text-stone-900">
            {data.nextExDate ?? "—"}
          </p>
          <p className="mt-1 text-[11px] text-stone-400">{data.nextExNote}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-stone-100 pt-3">
        <p className="mb-2 text-[11px] uppercase tracking-widest text-stone-400">
          近 4 次配息
        </p>
        <ul className="space-y-1">
          {data.history.map((d) => (
            <li
              key={d.exDate}
              className="flex items-baseline justify-between text-xs text-stone-700"
            >
              <span className="font-mono text-stone-500">{d.exDate}</span>
              <span className="font-mono">{d.amount.toFixed(2)} 元/股</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

### 8. 串接到頁面 (`src/app/theme/[slug]/page.tsx`)

加 imports：

```tsx
import { HoldingsCard } from "@/components/holdings-card";
import { MyPosition } from "@/components/my-position";
import { YieldCard } from "@/components/yield-card";
import { fetchYieldData } from "@/lib/dividend-data";
```

在 `outlookData` 抓資料的地方旁邊加 yield（並列，不要串行）：

```tsx
const [outlookData, yieldData] = slug === "0050"
  ? await Promise.all([
      fetchOutlookData(),
      // 用 outlookData 拿到的最新收盤價 → 算殖利率
      // 但因為 outlookData 是另一個 await，這裡會有循環依賴問題
      // 簡化做法：yieldData 接受 currentPrice 從 outlookData 的最後一筆 priceSeries 取
    ])
  : [null, null];
```

**注意**：`fetchYieldData(currentPrice)` 需要當下價格。實作建議：

```tsx
let outlookData = null;
let yieldData = null;
if (slug === "0050") {
  outlookData = await fetchOutlookData();
  const lastPrice = outlookData.priceSeries[outlookData.priceSeries.length - 1]?.price ?? 0;
  yieldData = await fetchYieldData(lastPrice);
}
```

版面（依 D-6 順序）：

```tsx
{slug === "0050" && outlookData && yieldData && (
  <>
    <OutlookLivePrice />
    <MyPosition />
    <OutlookStrip data={outlookData} />
    <div className="mb-8 grid gap-4 md:grid-cols-2">
      <HoldingsCard />
      <YieldCard data={yieldData} />
    </div>
    <OutlookCharts data={outlookData} />
  </>
)}
```

---

## 禁止碰的東西

- `src/data/editions.ts`、`src/app/article/[slug]/page.tsx`、`src/app/page.tsx`、首頁 / 文章內頁完全不動
- `src/components/outlook-strip.tsx`、`outlook-charts.tsx`、`outlook-live-price.tsx`（TASK-001 交付物，不要動視覺）
- `src/lib/outlook-data.ts`（不要塞配息邏輯進去，配息走 `dividend-data.ts`）
- `.env.local`、`AGENTS.md`、`CLAUDE.md`、TASK-001 檔
- 不要加任何登入 / 帳號 / 後端 DB
- 不要加 Cookie banner、不要加 GDPR 提示（localStorage 是 first-party，不需要）

---

## 驗收條件

- [ ] `npm run dev` 啟動無 error
- [ ] `/theme/0050` 顯示新的 MyPosition、HoldingsCard、YieldCard 區塊
- [ ] MyPosition：新增部位 → 重新整理頁面後仍存在
- [ ] MyPosition：未實現損益顏色（賺 teal、賠 red），數字計算正確（手算 `(price - avgCost) * shares` 對得上）
- [ ] MyPosition：清除按鈕能刪 localStorage、UI 回到「尚未設定部位」
- [ ] HoldingsCard：顯示 10 筆，台積電權重條最長，台積電 ~49%
- [ ] YieldCard：年化殖利率有數字（不論 source = finmind 或 fallback）
- [ ] YieldCard：近 4 次配息列表正確顯示
- [ ] YieldCard：右下角小字標示資料來源（FinMind 或 備援資料）
- [ ] `/theme/ai`、`/theme/macro` 等其他 theme **沒有** 出現任何新元件
- [ ] 首頁 `/` 沒變、文章內頁沒變
- [ ] 無 console error、無 type error
- [ ] localStorage key 為 `0050-position-v1`（之後升級 schema 才不衝突）

---

## Implementor 實作備註

（做完每一步、commit hash、超出 spec 的 ad-hoc 改動寫在這裡）
- 2026-06-07：TASK-002 完成 → commit `5aa57c0`；build 通過；待 CC `/code-review`。

