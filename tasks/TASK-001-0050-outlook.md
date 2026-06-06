# TASK-001-0050-Outlook 三檔位展望面板

## 背景
Owner 持有 0050，希望除了 daily news 之外，每天打開 0050 theme 頁能一眼看到：
- 未來「一個月 / 一季 / 一年以上」三個時間區間的展望分數
- 每個區間有一句話 briefing + 主因
- 配 2–3 個圖表佐證（價格、籌碼、權重股）

整個 app 採 Architect (Claude Code) → Implementor (Cursor) 分工，這份 Task File 是你的工作清單。

---

## 目標
完成後的狀態：

1. 進入 `http://127.0.0.1:3001/theme/0050` 時，header 下方、daily article 上方多了一個「三檔位展望」區塊
2. 三檔位以三張卡片並排呈現：一個月、一季、一年以上
3. 每張卡片顯示：分數（0–100）、方向標籤、橫條 + 圓點位置指示、一句話 briefing、主因
4. 三檔位下方有 tab 切換的圖表區（3 個 tab）
5. 全部使用 mock 資料，不接外部 API
6. 視覺風格與現有 daily news 一致（serif title、stone palette、圓角卡片）

---

## 已拍板決策（不可更動）
- **D-1**：分數採 0–100 制，不用 -50~+50（決定日：2026-06-05，by Owner）
- **D-2**：第一階段全部 mock，不接 Gemini 也不接股價 API
- **D-3**：圖表用 `recharts`（已由 Architect 推薦、Owner 授權）
- **D-4**：只動 `/theme/0050` 頁，不動首頁、不動文章內頁、不動 daily news 卡片
- **D-5**：對應位置在 theme header 下方、daily articles 上方（不是側邊欄、不是分頁）

---

## 協作規則
- **授權狀態：go 已授權**（Owner 2026-06-05 確認）
- 如有任何 spec 不清楚或與「已拍板決策」衝突 → 停下，在本檔最底「Implementor 實作備註」記下問題，等 Architect 回答
- commit 完後等 Architect 跑 `/code-review`，不要自己改 PROGRESS.md（目前還沒這個檔）

---

## 要改的檔案

| 檔案 | 動作 | 具體變更 |
|------|------|----------|
| `package.json` | 修改 | 加 `recharts` 到 dependencies |
| `src/lib/types.ts` | 修改 | 新增 `OutlookHorizon`、`OutlookData`、`PricePoint`、`FlowPoint` 等 type |
| `src/data/outlook.ts` | **新增** | export 一個 mock `outlook0050: OutlookData` 物件 |
| `src/components/outlook-strip.tsx` | **新增** | 三檔位卡片 component（client component，純展示 OK 用 server component 也可） |
| `src/components/outlook-charts.tsx` | **新增** | 三 tab 圖表 component（用 recharts，必須 `"use client"`） |
| `src/app/theme/[slug]/page.tsx` | 修改 | 在 `theme.status === "active"` 分支裡，於 `<div className="space-y-4">` 之前插入 `<OutlookStrip />` + `<OutlookCharts />`。**只在 slug === "0050" 時顯示**，避免污染未來其他 theme |

---

## 精確 Spec

### 1. Types (`src/lib/types.ts`，加在現有 export 後面)

```ts
export type OutlookDirection = "極空" | "偏空" | "中性" | "偏多" | "極多";

export interface OutlookHorizon {
  id: "1m" | "1q" | "1y";
  label: string;          // "一個月" / "一季" / "一年以上"
  score: number;          // 0–100
  direction: OutlookDirection;
  briefing: string;       // 一句話，建議 30–50 字
  driver: string;         // 主因，10–20 字
}

export interface PricePoint {
  date: string;           // "2025-06" 等月份字串
  price: number;
  ma20: number;
  ma60: number;
}

export interface FlowPoint {
  date: string;           // 日期 "06/03" 格式
  foreign: number;        // 累積外資（億元）
  trust: number;          // 累積投信（億元）
}

export interface TsmcPoint {
  date: string;
  price: number;
}

export interface OutlookData {
  asOf: string;           // "2026-06-05"
  horizons: OutlookHorizon[];   // 必須 3 個，順序 1m → 1q → 1y
  priceSeries: PricePoint[];    // 1 年 12 個月
  flowSeries: FlowPoint[];      // 近 60 個交易日
  tsmcSeries: TsmcPoint[];      // 1 年 12 個月
}
```

### 2. Mock Data (`src/data/outlook.ts`)

```ts
import type { OutlookData } from "@/lib/types";

export const outlook0050: OutlookData = {
  asOf: "2026-06-05",
  horizons: [
    {
      id: "1m",
      label: "一個月",
      score: 35,
      direction: "偏空",
      briefing: "外資調節壓力延續，須觀察 175 元支撐能否守穩。",
      driver: "外資 5 月最大賣超 / 跌破短均",
    },
    {
      id: "1q",
      label: "一季",
      score: 58,
      direction: "中性",
      briefing: "7 月除息行情 + 台積電法說將決定季度方向。",
      driver: "除息預期 + Fed 會議",
    },
    {
      id: "1y",
      label: "一年以上",
      score: 72,
      direction: "偏多",
      briefing: "AI 算力與半導體長線結構未變，下檔有撐。",
      driver: "台積電 CapEx 上修",
    },
  ],
  priceSeries: [
    { date: "25-07", price: 165, ma20: 162, ma60: 158 },
    { date: "25-08", price: 170, ma20: 167, ma60: 161 },
    { date: "25-09", price: 168, ma20: 169, ma60: 164 },
    { date: "25-10", price: 175, ma20: 172, ma60: 167 },
    { date: "25-11", price: 182, ma20: 178, ma60: 171 },
    { date: "25-12", price: 188, ma20: 184, ma60: 175 },
    { date: "26-01", price: 192, ma20: 189, ma60: 180 },
    { date: "26-02", price: 186, ma20: 188, ma60: 183 },
    { date: "26-03", price: 190, ma20: 188, ma60: 184 },
    { date: "26-04", price: 187, ma20: 188, ma60: 185 },
    { date: "26-05", price: 185, ma20: 187, ma60: 185 },
    { date: "26-06", price: 183, ma20: 185, ma60: 184 },
  ],
  flowSeries: [
    // 產生 30 筆，foreign 從 0 緩升到 +15、再回落到 -18 結尾；trust 全程小幅正向、收尾 +8 左右
    // 自己挑合理數字，符合「外資近期賣超、投信買盤」的故事
    { date: "04/22", foreign: 0, trust: 0 },
    { date: "04/24", foreign: 3, trust: 1 },
    { date: "04/28", foreign: 7, trust: 2 },
    { date: "04/30", foreign: 12, trust: 3 },
    { date: "05/05", foreign: 15, trust: 4 },
    { date: "05/07", foreign: 14, trust: 5 },
    { date: "05/09", foreign: 11, trust: 5 },
    { date: "05/13", foreign: 8, trust: 6 },
    { date: "05/15", foreign: 4, trust: 6 },
    { date: "05/19", foreign: 0, trust: 7 },
    { date: "05/21", foreign: -4, trust: 7 },
    { date: "05/23", foreign: -8, trust: 7 },
    { date: "05/27", foreign: -12, trust: 8 },
    { date: "05/29", foreign: -15, trust: 8 },
    { date: "06/02", foreign: -18, trust: 8 },
    { date: "06/05", foreign: -22, trust: 9 },
  ],
  tsmcSeries: [
    { date: "25-07", price: 850 },
    { date: "25-08", price: 880 },
    { date: "25-09", price: 870 },
    { date: "25-10", price: 920 },
    { date: "25-11", price: 970 },
    { date: "25-12", price: 1010 },
    { date: "26-01", price: 1040 },
    { date: "26-02", price: 1020 },
    { date: "26-03", price: 1050 },
    { date: "26-04", price: 1035 },
    { date: "26-05", price: 1020 },
    { date: "26-06", price: 1005 },
  ],
};
```

### 3. OutlookStrip (`src/components/outlook-strip.tsx`)

Pseudocode：

```tsx
import type { OutlookData, OutlookHorizon, OutlookDirection } from "@/lib/types";
import { outlook0050 } from "@/data/outlook";

const DIRECTION_COLOR: Record<OutlookDirection, string> = {
  極空: "#dc2626",   // red-600
  偏空: "#f97316",   // orange-500
  中性: "#a8a29e",   // stone-400
  偏多: "#14b8a6",   // teal-500
  極多: "#0f766e",   // teal-700
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  // 一條 stone-100 背景的橫條，position absolute 一個圓點在 score% 位置
  // 條高 6px，圓點 12px，圓點 border-white shadow
}

function HorizonCard({ horizon }: { horizon: OutlookHorizon }) {
  const color = DIRECTION_COLOR[horizon.direction];
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-stone-400">
          {horizon.label}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: `${color}14`, color }}
        >
          {horizon.direction}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-serif text-4xl tracking-tight text-stone-900">
          {horizon.score}
        </span>
        <span className="text-sm text-stone-400">/100</span>
      </div>

      <ScoreBar score={horizon.score} color={color} />

      <p className="mt-4 text-sm leading-relaxed text-stone-700">
        {horizon.briefing}
      </p>
      <p className="mt-2 text-xs text-stone-400">主因：{horizon.driver}</p>
    </div>
  );
}

export function OutlookStrip({ data = outlook0050 }: { data?: OutlookData }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          三檔位展望
        </h2>
        <span className="text-[11px] text-stone-400">As of {data.asOf}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {data.horizons.map((h) => (
          <HorizonCard key={h.id} horizon={h} />
        ))}
      </div>
    </section>
  );
}
```

### 4. OutlookCharts (`src/components/outlook-charts.tsx`)

```tsx
"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceLine,
} from "recharts";
import type { OutlookData } from "@/lib/types";
import { outlook0050 } from "@/data/outlook";

type Tab = "price" | "flow" | "tsmc";

const TABS: { id: Tab; label: string }[] = [
  { id: "price", label: "0050 價格與均線" },
  { id: "flow", label: "外資 / 投信籌碼" },
  { id: "tsmc", label: "台積電 (權重 48%)" },
];

export function OutlookCharts({ data = outlook0050 }: { data?: OutlookData }) {
  const [tab, setTab] = useState<Tab>("price");

  return (
    <section className="mb-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
              tab === t.id
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer>
          {tab === "price" && (
            <LineChart data={data.priceSeries}>
              <XAxis dataKey="date" stroke="#a8a29e" fontSize={11} />
              <YAxis stroke="#a8a29e" fontSize={11} domain={["dataMin - 5", "dataMax + 5"]} />
              <Tooltip />
              <Line type="monotone" dataKey="price" stroke="#0f766e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ma20" stroke="#a8a29e" strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="ma60" stroke="#d6d3d1" strokeDasharray="2 2" dot={false} />
            </LineChart>
          )}
          {tab === "flow" && (
            <AreaChart data={data.flowSeries}>
              <XAxis dataKey="date" stroke="#a8a29e" fontSize={11} />
              <YAxis stroke="#a8a29e" fontSize={11} />
              <Tooltip />
              <ReferenceLine y={0} stroke="#d6d3d1" />
              <Area type="monotone" dataKey="foreign" stroke="#dc2626" fill="#fecaca" fillOpacity={0.5} />
              <Area type="monotone" dataKey="trust" stroke="#0f766e" fill="#99f6e4" fillOpacity={0.5} />
            </AreaChart>
          )}
          {tab === "tsmc" && (
            <LineChart data={data.tsmcSeries}>
              <XAxis dataKey="date" stroke="#a8a29e" fontSize={11} />
              <YAxis stroke="#a8a29e" fontSize={11} domain={["dataMin - 30", "dataMax + 30"]} />
              <Tooltip />
              <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

### 5. Theme Page 修改 (`src/app/theme/[slug]/page.tsx`)

在 `active` 分支中插入：

```tsx
{theme.status === "empty" ? (
  <EmptyThemePanel theme={theme} />
) : (
  <>
    {slug === "0050" && (
      <>
        <OutlookStrip />
        <OutlookCharts />
      </>
    )}
    <div className="space-y-4">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} theme={theme} />
      ))}
    </div>
  </>
)}
```

最上方加 import：

```tsx
import { OutlookStrip } from "@/components/outlook-strip";
import { OutlookCharts } from "@/components/outlook-charts";
```

---

## 禁止碰的東西
- `src/data/editions.ts`（不要動 daily article 資料）
- `src/components/ask-panel.tsx`、`src/components/formatted-answer.tsx`、`src/app/api/ask/route.ts`（Gemini 相關，無關）
- `src/app/page.tsx`（首頁不變）
- `src/app/article/[slug]/page.tsx`（文章內頁不變）
- `src/components/site-header.tsx`、`src/components/theme-sidebar.tsx`、`src/components/icons.tsx`、`src/components/article-card.tsx`、`src/components/empty-theme.tsx`
- `.env.local`、`AGENTS.md`、`CLAUDE.md`

---

## 驗收條件
Architect `/code-review` 時會逐項對照：

- [ ] `npm install recharts` 完成，且 `package.json` 反映
- [ ] `npm run dev` 可正常啟動，無 compile error
- [ ] 開啟 `/theme/0050` 看到三檔位卡片並排
- [ ] 三張卡片數字、分數條位置、方向標籤、briefing、主因正確顯示
- [ ] 圖表 tab 切換正常，三張圖都能渲染
- [ ] 開啟 `/theme/ai` 等其他 theme 頁，**沒有** 出現 Outlook 區塊
- [ ] 首頁 `/` 沒有變化
- [ ] 文章內頁 `/article/0050-daily-briefing-0605` 沒有變化
- [ ] 沒有 console error / type error
- [ ] 視覺風格延續現有 stone palette + serif title

---

## Implementor 實作備註
（你做完每一步、有疑問或需要 Architect 補規格時寫在這裡）
- 2026-06-06：完成 TASK-001 全部實作（types、outlook mock、OutlookStrip、OutlookCharts、theme/0050 頁插入）；npm install recharts；build 通過。types.ts / theme page 曾遇 UTF-16 編碼問題，已用 shell 重寫修正。

