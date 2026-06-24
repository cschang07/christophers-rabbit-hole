# TASK-005 — 統一 App 外殼（去腫瘤）＋ News 當首頁

## 背景
目前 app 有**三個各自獨立的外殼**，互不相連，導致 News 像「獨立腫瘤」：

| 路由 | 外殼 | 問題 |
|------|------|------|
| `/` | `ChatApp`（全螢幕，無 sidebar） | 首頁是實驗性的 chat，不是重點功能 |
| `(productivity)/*` | `ProductivitySidebar` | app 的主外殼（Todo/Board/Calendar…） |
| `news/*` | `SiteHeader`（另一套 nav） | **不共用 productivity sidebar**，切過去像離開 app |

Owner 已拍板：News 是重點、Chat 是實驗性可後放、Todo/Kanban/Calendar 是核心。

## 目標
**一個共用 sidebar 外殼**統管所有頁面。News feed 變成首頁 `/`，Chat 降為 sidebar 裡的一個分頁。從任何頁切到 News 都在同一個外殼內，無縫、不再有腫瘤感。

## 已拍板決策（2026-06-25，不可改動）
- **D1**：採「統一 sidebar」——一個 `AppSidebar` 同時管 News / Productivity / Chat。砍掉 `news/layout.tsx` 的獨立 `SiteHeader`。
- **D2**：`/`（首頁）= News feed（今日 edition）。Chat 移到 `/chat`。
- **D3**：Pomodoro 之後會關（TASK 另開），本任務**不動** Pomodoro 邏輯，只在 sidebar 保留入口。

## 協作規則
- **等 Owner 說「go」才實作。** 在那之前只讀、只問。
- 卡住／規格不清 → 寫進本檔最下方「Cursor 實作備註」（`@cc` 問規格、`@owner` 要決策），不要硬猜。

## 要改的檔案

### 新增：route group `(app)` 共用外殼
> Next.js route group `(app)` 不影響 URL，純粹讓底下所有頁共用同一個 `layout.tsx`。

- `src/app/(app)/layout.tsx` — **新增**。client layout：
  ```tsx
  'use client';
  import { PomodoroProvider } from '@/context/pomodoro';
  import { RecorderProvider } from '@/context/recorder';
  import { AppSidebar } from '@/components/app-sidebar';

  export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
      <PomodoroProvider>
        <RecorderProvider>
          <div className="flex min-h-screen flex-col lg:flex-row">
            <AppSidebar />
            <main className="prd-app min-w-0 flex-1">{children}</main>
          </div>
        </RecorderProvider>
      </PomodoroProvider>
    );
  }
  ```
  （Provider 包住全部頁面 → mini-timer 跨頁持續，包含 News。）

### 檔案搬移（只移動路由檔位置，`@/` import 不變）
| 從 | 到 | 備註 |
|----|----|------|
| `src/app/news/page.tsx` | `src/app/(app)/page.tsx` | 變成 `/`；移除頁內「Back Home」連結（它就是 home 了）；保留 `ThemeSidebar` 作為內容區主題跳轉 |
| `src/app/news/article/[slug]/page.tsx` | `src/app/(app)/news/article/[slug]/page.tsx` | URL 仍為 `/news/article/...`；移除頁內 `☰ Home` 連結（外殼已有 sidebar） |
| `src/app/news/theme/[slug]/page.tsx` | `src/app/(app)/news/theme/[slug]/page.tsx` | URL 不變 |
| `src/app/page.tsx`（ChatApp） | `src/app/(app)/chat/page.tsx` | Chat 移到 `/chat` |
| `src/app/(productivity)/todo/page.tsx` | `src/app/(app)/todo/page.tsx` | URL `/todo` 不變 |
| `src/app/(productivity)/board/page.tsx` | `src/app/(app)/board/page.tsx` | |
| `src/app/(productivity)/calendar/page.tsx` | `src/app/(app)/calendar/page.tsx` | |
| `src/app/(productivity)/notes/page.tsx` | `src/app/(app)/notes/page.tsx` | |
| `src/app/(productivity)/pomodoro/page.tsx` | `src/app/(app)/pomodoro/page.tsx` | |
| `src/app/(productivity)/game/page.tsx` | `src/app/(app)/game/page.tsx` | |

### 刪除
- `src/app/news/layout.tsx`（獨立 SiteHeader 外殼，不再需要）
- `src/app/(productivity)/layout.tsx`（被 `(app)/layout.tsx` 取代）
- `src/components/site-header.tsx`（無人引用後刪除；先 `grep -rn "site-header\|SiteHeader" src/` 確認 0 引用）
- 空掉的 `src/app/news/`、`src/app/(productivity)/` 目錄

### Sidebar：`ProductivitySidebar` → `AppSidebar`
- `src/components/productivity-sidebar.tsx` → 改名 `src/components/app-sidebar.tsx`，匯出 `AppSidebar`。
- nav 分三組（沿用現有 stone/teal 風格與 mobile drawer 邏輯，**只改連結清單**）：
  - **新聞**：`今日新聞` → `/`
  - **生產力**：`To-Do` `/todo`、`Board` `/board`、`Calendar` `/calendar`、`Notes` `/notes`、`Pomodoro` `/pomodoro`、`Break` `/game`
  - **其他**：`Chat` → `/chat`
- 品牌連結（已指向 `/`）維持不變。
- active 狀態：用 `usePathname()` 高亮目前頁（`/` 對 News、`/chat` 對 Chat…）。

## 精確 spec / 注意事項
- `(app)/page.tsx`（前 news/page）原本 `export const dynamic = "force-dynamic"` 與 Suspense streaming **保留**。
- 不要改 `src/app/layout.tsx`（root：html/body/fonts/viewport）。
- 不要改任何 news 生成邏輯（`news-gen.ts`、`editions.ts`、`tavily.ts`）。
- 不要改 backend、docker-compose、Hermes 設定。
- 搬移後逐一確認 import 路徑（`@/` 絕對路徑不受影響，但 relative import 若有要修）。

## 禁止碰的東西
- `src/lib/news-gen.ts`、`src/data/editions.ts`、`src/lib/tavily.ts`（新聞生成）
- `src/context/pomodoro.tsx`、`src/context/recorder.tsx`（只搬 provider 位置，不改內部）
- `backend/`、`docker-compose*.yml`、`Dockerfile`
- `.env`（含密鑰，gitignore）

## 驗收條件
- [ ] `/` 顯示今日 News feed，且左側是統一 `AppSidebar`（不是舊 SiteHeader）
- [ ] sidebar 可在同一外殼內切換 News / Todo / Board / Calendar / Notes / Pomodoro / Game / Chat，皆共用同一外殼
- [ ] `/chat` 顯示原本的 ChatApp，功能不變
- [ ] `/news/article/<slug>`、`/news/theme/<slug>` 仍可開、外殼一致
- [ ] mobile：hamburger drawer 正常、mini-timer 跨頁（含 News）持續
- [ ] `grep -rn "SiteHeader\|productivity-sidebar" src/` 無殘留引用
- [ ] `npx tsc --noEmit` 與 `npm run build` 無錯
- [ ] 在**容器** `http://localhost:3008` 驗證（依 AGENTS.md：`docker compose build web && docker compose up -d web`，勿起 host server）

## Cursor 實作備註
（實作時在此記：日期 + 做了什麼 + 疑問。完成同時更新 PROGRESS.md ✅ 區並 commit。）
