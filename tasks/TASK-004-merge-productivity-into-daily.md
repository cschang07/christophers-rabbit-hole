# TASK-004 — 把 productivity-app 併入 Christopher Daily

## 背景

目前有兩個獨立專案：

- **christopher-daily**：Next.js 16 + React 19 + TypeScript + Tailwind v4。每日新聞探索 app，畫面漂亮，但沒有資料庫（mock data + LLM route handler）。`npm run dev`，port 3001。
- **productivity-app**：React 18 + Vite 前端（JSX，1,916 行）+ FastAPI + Postgres 後端（1,049 行）。六個功能：To-Do、看板、行事曆（含 Google 同步）、Markdown 筆記（含會議錄音→Gemini 轉錄）、番茄鐘、Tetris。Docker compose，port 3000。

Owner 決定：**以 christopher-daily 為基底，把 productivity-app 整個搬進來**，新聞變成「生產力工具裡的一個項目」。最終產品定位 = 生產力工具，每日新聞是其中一個 section。

## 目標

1. 一個 Next.js app（christopher-daily），左側 sidebar 導覽：To-Do / Board / Calendar / Notes / Pomodoro / Break Game / **News**。
2. News = 現有 christopher-daily 首頁/主題/文章頁，整包移到 `/news` 之下，功能不變。
3. 六個生產力功能改寫成 Next.js app-router 頁面（TS + Tailwind），呼叫既有 FastAPI 後端，**後端 Python 不重寫**。
4. 一鍵 `docker compose up` 起整套（db + backend + Next.js）。

## 已拍板決策

- **後端策略 A**：保留 FastAPI + Postgres 原封不動，Next.js 當前端去呼叫。不改寫成 Next API route，不換 DB。
- **路由撞名解法**：Next.js `next.config.ts` 用 `rewrites()` 的 `afterFiles`，把 `/api/:path*` 轉發到 `http://backend:8000/api/:path*`；本地保留的 `/api/ask`、`/api/quote`（新聞 LLM）因為是實體 route handler，會優先於 `afterFiles` rewrite 命中，不衝突。（實作前先讀 `node_modules/next/dist/docs/` 確認 Next 16 rewrites 行為。）
- **新聞 section 路徑**：首頁 `/` 改成生產力工具入口（預設導去 `/todo` 或一個總覽），新聞移到 `/news`、`/news/theme/[slug]`、`/news/article/[slug]`。
- **狀態管理**：PomodoroContext、RecorderContext 改成 client context provider，包在生產力區塊的 layout；mini-timer / mini-recorder 跨頁持續。News 區塊維持 server component。
- **部署**：christopher-daily repo 內新增 `backend/`（從 productivity-app 搬入）與 `docker-compose.yml`（db + backend + web 三個 service）。web service 跑 `next start`，不再用 nginx。
- **舊的 productivity-app**：搬完驗收過後保留為封存，不刪（Owner 另行決定）。

## 協作規則

- 分階段，每階段自我 QC（能跑、不丟 error）後 commit + push，不批次。
- 每個生產力頁面搬完即可單獨驗收。
- TS strict、Tailwind utility，沿用現有設計 tokens（globals.css 的 stone/teal 色系、DM Sans + Newsreader 字體）。
- 動 Next 設定（rewrites、layout、route group）前先讀 Next 16 docs。

## 要改的檔案（規劃）

新增 / 搬入：
- `backend/`（整包從 productivity-app 搬入，含 Dockerfile）
- `docker-compose.yml`（db + backend + web）
- `.dockerignore`、`Dockerfile`（Next.js production）
- `src/lib/api.ts`（TS 版 fetch client，對應舊 `api.js`）
- `src/app/(productivity)/layout.tsx`（sidebar + Pomodoro/Recorder provider）
- `src/app/(productivity)/todo/page.tsx`、`board/`、`calendar/`、`notes/`、`pomodoro/`、`game/`
- `src/context/pomodoro.tsx`、`src/context/recorder.tsx`
- `src/components/` 內各功能元件（TaskModal、看板、行事曆、Tetris…）的 TS 版

調整：
- `next.config.ts`（加 rewrites）
- `src/app/page.tsx`（改成生產力入口）
- 新聞相關頁面移到 `src/app/news/...`，`site-header.tsx` 改成整體導覽
- `src/data/editions.ts`、新聞元件的內部連結改指 `/news/...`

## 精確 spec — 分階段

- **Stage 0｜骨架**：搬 `backend/` 入 repo；寫 `docker-compose.yml`（db/backend/web）+ Next production Dockerfile；`next.config.ts` 加 rewrites；`src/lib/api.ts`；把新聞移到 `/news` 並修內部連結；建生產力 route group 的 sidebar shell（News + 六個 placeholder 頁）。**驗收**：`docker compose up` 起得來、`/news` 新聞照常、sidebar 可切換、`/api/health` 透過 web 可達。
- **Stage 1｜To-Do**：port `TodoPage` + `useTasks` + `TaskModal` → TS。CRUD 接 `/api/tasks`。
- **Stage 2｜Board**：port 看板 + Trello 式拖拉（drop indicator）。共用 tasks API。
- **Stage 3｜Calendar**：port 月曆 + 事件 CRUD + Google OAuth 連結與雙向同步 UI。接 `/api/events`、`/api/google`。
- **Stage 4｜Notes**：port Markdown 筆記（`marked` → 改用 TS 相容 md 渲染）+ 會議錄音 RecorderContext + 轉錄重試。接 `/api/notes`、`/api/recordings`。
- **Stage 5｜Pomodoro**：port 計時器 + 任務連結 + 統計；PomodoroContext + mini-timer。接 `/api/pomodoro`。
- **Stage 6｜Break Game**：port Tetris 到 client component。
- **Stage 7｜收尾**：首頁總覽/導向、README、移除殘留的 Vite/nginx 設定、封存舊 repo 說明。

## 禁止碰的東西

- 不改 FastAPI 後端的商業邏輯、資料表、API 合約（只搬檔案、不改行為）。
- 不動 Postgres schema 與既有資料遷移邏輯（`main.py` 的 light migration 保留）。
- 不重寫新聞的 ask/quote LLM 邏輯，只改它的掛載路徑與內部連結。
- 不引入新後端框架 / ORM / 資料庫。

## 驗收條件

- `docker compose up --build` 一鍵起 db + backend + Next.js，`http://localhost:3000` 可開。
- Sidebar 七個項目（含 News）皆可切換、各功能與舊 productivity-app 行為一致。
- 新聞 ask/quote 仍正常（route handler 沒被 rewrite 吃掉）。
- 番茄鐘 mini-timer、錄音 mini-recorder 跨頁持續。
- Google 同步、Gemini 轉錄在有 `.env` 金鑰時可用，無金鑰時其餘功能不受影響。
- `npm run build` 無 TS error。

---

## Implementor 實作備註

- 2026-06-13 Stage 0 完成：搬入 backend/、docker-compose.yml、Dockerfile、.dockerignore、next.config.ts afterFiles rewrites、src/lib/api.ts、新聞移至 /news、生產力 sidebar shell + 6 placeholder 頁、/ 重導 /todo。
- Rewrites 依據：Next 16 docs `rewrites.md` 路由順序 — static/route handlers 先於 afterFiles；實測 `/api/ask` 走 Next handler（backend 無此路由會 404），`/api/health` 與 `/api/tasks` 經 rewrite 到 backend 200。
- Docker QC：`npm run build` 通過；`docker compose run` web on :3002 驗證 /news、/todo、/api/health、/api/tasks OK。`:3000` 被既有 productivity-app-frontend 佔用，需先 stop 該容器才能 `docker compose up` 綁定 3000。
- commit: 4193f00
