# Christopher's Rabbit Hole — 開發進度記錄

<!-- 每次 session 結束時由 Claude Code 更新 -->

## 🔄 目前進行中


## ⛔ 已知問題 / 待決策

- **[待決策] TASK-002（選擇性）**：冷啟動 9s 優化——horizons cache miss 時串流顯示，等 Owner say go 才動
- **[已知問題] 文章頁追問壞掉**：`AskPanel` → `/api/ask`（直打 Gemini `gemini-3.5-flash`）目前不能用。由 **TASK-006** 整碗改接 Hermes 取代，不單獨除錯。
- **[規格已備，等 go] TASK-005 統一 App 外殼**：News 像獨立腫瘤（三套外殼）。決策 D1 統一 sidebar／D2 News=`/`／D3 Pomodoro 另案關。規格見 `tasks/TASK-005-unify-app-shell.md`。
- **[規格已備，等 go] TASK-006 News Q&A 接 Hermes（Perplexity Discover）**：feed+文章底部問答、hybrid 取材（當頁優先、超範圍才 Tavily）、Hermes 串流＋引用。**依賴 TASK-005 先合併**。規格見 `tasks/TASK-006-news-ask-hermes-perplexity.md`。

## ✅ 近期完成（最新在上）

- [2026-06-25] cc 規劃：full review 後定方向——核心=Todo/Kanban/Calendar；News 去腫瘤＋接 Hermes 問答為當前重點；Pomodoro 之後關、Chat 優化後放。產出 TASK-005、TASK-006 規格，Owner 拍板 D1–D3（統一 sidebar／News=首頁／hybrid 取材）。
- [2026-06-25] chore(collab)：把 `.cursor/` 協作規則納入版控＋ ignore `outputs/`（commit: 46b68f2）
- [2026-06-25] feat(ui)：各頁 Back Home 連結、mobile 導覽列、chat 狗狗吉祥物、iOS 防自動放大（commit: 7d31924）
- [2026-06-23] News 真實化：移除全部 hardcoded 文章，改成「Tavily(topic=news) 抓當日來源 → Gemini 合成繁中 digest（含真實引用連結）」，每主題每天一篇、`unstable_cache` 24h；6 個主題（0050/AI/Bitcoin/Semiconductor/Macro/Taiwan Market）全部 active。新增 `src/lib/tavily.ts`、`src/lib/news-gen.ts`；`editions.ts` 改靜態主題設定 + async 取文；edition 日期改 Asia/Taipei 即時（不再凍結 6/5）。順手修好 Docker 內 `GEMINI_API_KEY` 為空、導致 outlook horizons / ask 靜默失效的問題（key 寫進 gitignore 的 `.env`）。holdings 仍靜態（無可靠免費 0050 權重 API）。
- [2026-06-16] Calendar 自動 sync：進頁／換月／存刪 event／每 5 分鐘背景拉 Google；移除手動 ⟳ Sync 按鈕（仍保留 Syncing… 狀態與 disconnect）
- [2026-06-16] Google Calendar：從 `~/.hermes/google_token.json` 自動匯入 OAuth；docker-compose 掛載 token；Calendar 顯示 work 任務 due date
- [2026-06-16] Todo 與 Board 分離：`list_type`（personal / work）欄位；To-Do 記生活瑣事、Board 記工作；Pomodoro 只連工作任務
- [2026-06-16] TASK-004 Stage 7 CLOSED：README 全面重寫（功能、stack、dev/Docker 啟動、env vars、結構）；無 Vite/nginx 殘留；homepage redirect `/todo` 已到位。TASK-004 全部完成。
- [2026-06-16] init: 建立三方協作骨架並 generalize（移除 HURC 特定參照）；同步 PROGRESS 至真實狀態
- [2026-06-16] TASK-004 Stage 1–6：port 全部 6 個生產力頁面（To-Do、Board、Calendar、Notes、Pomodoro、Tetris）→ TypeScript + Tailwind，接 FastAPI 後端（commit: 52cfacf）
- [2026-06-16] chore: rename → Christopher's Rabbit Hole + stone/teal 主題；port 統一到 3008（commit: 42d0c60 / 0db1167）
- [2026-06-13] TASK-004 Stage 0：搬入 backend/、docker-compose.yml、Dockerfile、next.config.ts rewrites；新聞移至 /news；生產力 sidebar shell（commit: 4193f00）
- [2026-06-07] TASK-001 CLOSED：0050 三檔位展望 + 真實市場資料（Yahoo Finance / FinMind / Gemini-3.5-flash）；10 項驗收條件全過（commit: ad89a65）

## 📍 中斷點

cc 已完成 full review 與規劃，TASK-005／TASK-006 規格就緒、決策已拍板。**等 Owner 說「go」** → Cursor 先做 TASK-005（統一外殼，較單純的搬移），合併後再做 TASK-006（依賴 005 的 `(app)/` 路徑與 `/`＝feed）。

## ⏭ 下一步

1. **TASK-005｜統一 App 外殼（去腫瘤）** — `(app)` route group 共用外殼、`AppSidebar`、News=`/`、Chat→`/chat`。等 go。
2. **TASK-006｜News Q&A 接 Hermes（Perplexity Discover）** — feed+文章問答、hybrid 取材、Hermes 串流＋引用。**接在 005 之後**。
3. （之後）Pomodoro feature-flag 關閉；Chat 體驗優化。
