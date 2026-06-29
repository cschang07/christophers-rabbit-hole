# Christopher's Rabbit Hole — 開發進度記錄

<!-- 每次 session 結束時由 Claude Code 更新 -->

## 🔄 目前進行中


## ⛔ 已知問題 / 待決策

- **[待決策] TASK-002（選擇性）**：冷啟動 9s 優化——horizons cache miss 時串流顯示，等 Owner say go 才動

## ✅ 近期完成（最新在上）

- [2026-06-25] **拿掉 Bitcoin / Semiconductor / Macro 三個新聞主題**：`src/data/editions.ts` 的 `themes` 陣列移除這三筆，`news-gen.ts` 的 `THEME_QUERY` 同步清掉對應搜尋關鍵字。剩 0050 / AI / Taiwan Market 三個主題。容器內驗證：三個被拿掉的 `/news/theme/<slug>` 皆 404，剩下三個與首頁皆 200。`tsc --noEmit` 過。
- [2026-06-25] **Cloudflare 路徑曝露——試做後 Owner 決定整套退回原狀**：原想透過 hurc-km-bot-dev 既有 tunnel 域名 `app.hurckmaibot-dev.com` 加一條冷僻 path `/christophersrabbitholesurprise` 轉到本專案 port 3008，省一個 ngrok 帳號。實作到一半（`next.config.ts` 加 `basePath`、5 個裸 fetch/img 檔案補前綴、修掉 `src/proxy.ts` 兩個 basePath bug——登入導頁漏前綴、Next 16 matcher 對裸 basePath 根路徑沒擋到密碼門——容器內 curl 全驗證過，cloudflared 設定也寫好且 validate 過），Owner 回頭問「ngrok 不是好好的？」確認這只是想要的附加功能、非必要，決定不值得這些代價（code 改動範圍變廣、Google OAuth callback 要連帶改、且要 sudo 重啟會動到正在跑的 KM bot）。**已用 `git checkout` 整批還原所有 code/Dockerfile/compose 改動，container 重新 build+restart 確認 root 行為恢復原狀；`~/.cloudflared/config.yml` 裡新增的規則也手動移除（該規則從未被 daemon 套用過，因為 sudo 重啟那步本來就還沒做）**。結論：ngrok 維持唯一外部入口，不再追加 cloudflared path。

- [2026-06-25] **TASK-006 CLOSED**：News Q&A 接 Hermes（Perplexity Discover 樣式）。新增 `/api/news/ask`（NDJSON 串流）：Gemini 先做相關性 gate（`needsSearch`/`searchQuery`），範圍內問題直接用頁面 context 回答、範圍外才呼叫 Tavily 補來源；組好 grounded prompt 丟給 **Hermes**（`createSession`+`streamSessionChat`，沿用 `hermes-chat.ts`）串流回答。新增共用元件 `NewsAsk`，接在 feed 首頁（`FeedAsk` 用 Suspense 包、不擋首頁初次渲染）與文章頁底部。刪除舊的 `AskPanel`／`/api/ask`（直打 Gemini，已知壞掉，整碗換掉不單獨除錯）。`news-gen.ts` 的 `hostLabel` 改為 export 共用。實作中抓到並修掉兩個真問題：①把同句子的 [c#] 引用標記寫死在 prompt 裡會讓模型在「沒有補充來源」時也幻覺生成 [c1]，改成依 sourceBlock 是否存在明確切換指示文字；②Hermes session 標題有唯一性限制，原本用 `question.slice(0,40)` 當 title，同一問題問兩次會撞名導致 400 被誤判成「Hermes 無法連線」——改成不帶 title（這類 session 是用完即丟的 grounding 容器，不需要人類可讀名稱）。容器內驗證：同句重複問兩次皆 200、範圍外問題確實觸發 Tavily 並附上真引用、找不到答案時老實說不知道（不捏造）、feed 與文章頁皆正確顯示「問問今日新聞」／「追問這篇文章」。`tsc --noEmit`／`next build` 通過。Branch：`feat/unify-shell-news-ask`（疊在 TASK-005 上）。
- [2026-06-25] **TASK-005 CLOSED**：統一 App 外殼。新建 `(app)` route group + `AppLayout`，`ProductivitySidebar`→`AppSidebar`（三組 nav：新聞/生產力/其他）；News feed 搬到 `/`，Chat 搬到 `/chat`；砍掉 news 獨立 `SiteHeader`／舊 `(productivity)/layout.tsx`；順手清掉統一後變成重複的殼：`ThemeSidebar`／文章頁的「Back Home」連結、`ChatApp` 自帶的 pill nav 與 hamburger drawer（已由 AppSidebar 取代）、刪除未被引用的死碼 `chat-sidebar.tsx`。`tsc --noEmit`／`next build` 通過；容器內 curl 驗證 `/`、`/chat`、`/todo`、`/board`、`/calendar`、`/notes`、`/pomodoro`、`/game`、`/news/theme/0050`、`/news/article/0050-2026-06-25` 全部 200，sidebar 與 News 內容皆正確渲染。Branch：`feat/unify-shell-news-ask`。
- [2026-06-25] cc 規劃：full review 後定方向——核心=Todo/Kanban/Calendar；News 去腫瘤＋接 Hermes 問答為當前重點；Pomodoro 之後關、Chat 優化後放。產出 TASK-005、TASK-006 規格，Owner 拍板 D1–D3（統一 sidebar／News=首頁／hybrid 取材）。
- [2026-06-25] chore(collab)：把 `.cursor/` 協作規則納入版控＋ ignore `outputs/`（commit: 46b68f2）
- [2026-06-25] feat(ui)：各頁 Back Home 連結、mobile 導覽列、chat 狗狗吉祥物、iOS 防自動放大（commit: 7d31924）
- [2026-06-23] News 真實化：移除全部 hardcoded 文章，改成「Tavily(topic=news) 抓當日來源 → Gemini 合成繁中 digest（含真實引用連結）」，每主題每天一篇、`unstable_cache` 24h；6 個主題（0050/AI/Bitcoin/Semiconductor/Macro/Taiwan Market）全部 active。新增 `src/lib/tavily.ts`、`src/lib/news-gen.ts`；`editions.ts` 改靜態主題設定 + async 取文；edition 日期改 Asia/Taipei 即時（不再凍結 6/5）。順手修好 Docker 內 `GEMINI_API_KEY` 為空、導致 outlook horizons / ask 靜默失效的問題（key 寫進 gitignore 的 `.env`）。holdings 仍靜態（無可靠免費 0050 權重 API）。
- [2026-06-16] Chat branding 還原：藍色 SVG logo 圓圈（header + Ask Rabbithole 大圖），修正誤改成米色 ring 頭像
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

TASK-005、TASK-006 皆已完成並在容器內驗證通過，commit 在 branch `feat/unify-shell-news-ask`（尚未 merge main，等 Owner 看過再決定）。

## ⏭ 下一步

1. Owner 過目 `feat/unify-shell-news-ask` → 決定 merge `main`。
2. （之後）Pomodoro feature-flag 關閉；Chat 體驗優化。
