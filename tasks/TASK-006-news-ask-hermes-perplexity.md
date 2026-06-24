# TASK-006 — News Q&A 接 Hermes（Perplexity Discover 樣式）

## 背景
文章頁底部原有「追問這篇文章」`AskPanel`，接 `/api/ask` **直打 Gemini**（model 寫死 `gemini-3.5-flash`），目前實測**不能用**。Owner 要的是：
- 在 News **下方就能問問題**（像 Perplexity Discover），不只文章頁，feed 首頁也要能問。
- **接 Hermes**（與站上 chat 同一個模型/人格）。
- 回答要 grounded（附引用），串流顯示。

## 目標
新增統一的 News 問答元件，feed 首頁與文章頁底部皆可用：輸入問題 → grounded 在來源上的串流回答 → 附引用 pills（Perplexity 風格）。後端用 **Hermes 串流** 產生回答，retrieval 由我們的 route 編排。

## 已拍板決策（2026-06-25，不可改動）
- **D1**：回答由 **Hermes**（`api_server` platform，純 chat 無 tools）串流產生。Hermes 自己不能搜尋，**檢索與組 context 一律在我們的 route 內做**，再把 grounded prompt 當訊息丟給 Hermes。
- **D2（hybrid 取材）**：**先用當頁內容**（文章全文 / 首頁今日 edition 摘要）當 context；**偵測到問題超出範圍才**呼叫 Tavily 即時搜尋，把新來源加進 context。
- **D3**：依賴 TASK-005 的統一外殼與 `/`＝feed。**TASK-005 先做、合併後再做本任務**（本任務的檔案路徑以 `(app)/` 為準）。

## 協作規則
- **等 Owner 說「go」才實作。** TASK-005 未合併前不要起手本任務的頁面接線（API route 可先獨立開發）。
- 規格不清 → 寫本檔最下方「Cursor 實作備註」（`@cc`／`@owner`），不要硬猜。

## 要改的檔案

### 新增 API route：`src/app/api/news/ask/route.ts`（POST，串流）
**Request JSON**：`{ question: string; pageContext: string; theme?: string }`
- `pageContext`：文章頁＝文章全文；feed＝今日各主題 title+dek 串接。
- `theme`：主題 slug（決定 Tavily 搜尋語境，可選）。

**編排流程**：
1. **相關性 gate**（便宜快速）：用 Gemini flash 做一次 JSON 判斷
   ```
   model: process.env.GEMINI_MODEL || "gemini-2.5-flash"
   responseSchema: { needsSearch: boolean, searchQuery: string | null }
   prompt: 給定「使用者問題」與「頁面內容」，判斷此問題能否僅憑頁面內容回答。
           能 → needsSearch=false；不能（問到頁面外/更新的事）→ needsSearch=true 並給一句中文 searchQuery。
   ```
   > 注意：先確認專案實際可用的 Gemini model 名稱（`news-gen.ts` 目前預設 `gemini-3.5-flash`；舊 `/api/ask` 也用它卻壞掉——**實作時驗證哪個 model 真的會回 200**，gate 與本 route 一律對齊那個可用名稱，不要沿用壞的）。
2. **needsSearch=true** → `searchTavily(searchQuery, { topic: "news", maxResults: 6, days: 7 })`，組 `sources[]`，做 `citations[] = {id:"c1.." , label: hostLabel(url), url}`（`hostLabel` 從 `news-gen.ts` 抽出成共用 util，或在 `src/lib/news-gen.ts` `export`）。
3. **組 grounded 訊息**（給 Hermes 的單則 message）：
   ```
   你是新聞助理。只根據下方內容用繁體中文回答，分段清楚、可條列、重點 **粗體**；
   有引用來源時在句末標 [c#]；資訊不足就說明，不要捏造。

   【頁面內容】
   {pageContext}

   {needsSearch ? "【補充來源】\n" + sourceBlock : ""}

   【問題】{question}
   ```
4. **Hermes 串流**：`createSession({ title: question.slice(0,40) })` → `streamSessionChat(session.id, message)`（沿用 `src/lib/hermes-chat.ts`）。解析 Hermes SSE 取出 token delta，**重新以 NDJSON 串給前端**。
5. **回傳協定（NDJSON，每行一個 JSON）**：
   - 先送一行 `{"type":"meta","citations":[{id,label,url}...]}`（needsSearch=false 時 citations 用 pageContext 既有引用或空陣列）
   - 接著多行 `{"type":"token","text":"..."}`
   - 結束 `{"type":"done"}`
   - 錯誤：`{"type":"error","message":"Hermes 暫時無法連線，稍後再試"}`（Hermes `HermesChatError`/503 時）
   - `Content-Type: application/x-ndjson; charset=utf-8`

### 新增共用元件：`src/components/news-ask.tsx`（client）
- Props：`{ pageContext: string; theme?: string; variant: "feed" | "article"; placeholder?: string }`
- UI（沿用現有 stone/teal 風格，參考舊 `ask-panel.tsx` 的版面）：
  - 標題：feed＝「問問今日新聞」；article＝「追問這篇文章」
  - 建議問題 chips（feed 與 article 各一組預設）
  - 輸入框 + 送出（`SendIcon`）；送出後串流顯示回答
  - 回答區：`FormattedAnswer` 渲染 markdown；下方 citation pills（點開原文連結，新分頁）
  - 串流中顯示「思考中…」與可中止（沿用站上 chat 既有 stop 模式即可，非必須）
- 讀 `/api/news/ask` 的 NDJSON：逐行 parse，`meta`→存 citations、`token`→append、`error`→顯示友善訊息。

### 接線
- `src/app/(app)/page.tsx`（feed 首頁）：底部加 `<NewsAsk variant="feed" pageContext={editionSummary} />`。
  - `editionSummary` 在 server 端組好（各主題 `title + dek` 串接）傳給 client 元件。
- `src/app/(app)/news/article/[slug]/page.tsx`：把舊 `<AskPanel>` 換成
  `<NewsAsk variant="article" theme={theme.slug} pageContext={[title, dek, ...sections...].join("\n\n")} />`。

### 刪除
- `src/components/ask-panel.tsx`（被 `news-ask.tsx` 取代）
- `src/app/api/ask/route.ts`（被 `/api/news/ask` 取代）

## 禁止碰的東西
- `src/lib/hermes-chat.ts` 的 auth/設定（只呼叫既有 export，不改授權邏輯）
- `src/lib/news-gen.ts` 的生成流程（可 `export hostLabel`，但不改生成邏輯）
- backend、docker-compose、Hermes 服務本身
- `.env`（密鑰）

## 驗收條件
- [ ] feed 首頁底部可問問題、串流回答、附引用 pills
- [ ] 文章頁底部可問問題（舊 AskPanel 已移除，行為由 Hermes 接手）
- [ ] **in-scope** 問題（答案在頁面內）→ 不觸發 Tavily，直接用頁面 context 回答
- [ ] **out-of-scope** 問題（問到更新/頁面外）→ 觸發 Tavily、回答含**新來源**引用
- [ ] Hermes 不可達 → 顯示友善錯誤，不是白畫面或 raw 500
- [ ] 回答為 Hermes 產生（非直接 Gemini）；`grep -rn "api/ask\b\|ask-panel" src/` 無殘留
- [ ] `npx tsc --noEmit` 與 `npm run build` 無錯
- [ ] 容器 `http://localhost:3008` 驗證（`docker compose build web && docker compose up -d web`，勿起 host server）

## Cursor 實作備註
（實作時記：日期 + 做了什麼 + 疑問。完成同時更新 PROGRESS.md ✅ 並 commit。）
