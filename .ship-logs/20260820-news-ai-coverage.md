# Ship log — News AI coverage recovery (2026-08-20, git c569c32 + scoped dirty News fix)

## 上了什麼

恢復 AI／台股每日新聞，讓官方模型發布成為 AI 文章來源，並讓 Grok 4.6 在首頁模型發布區直接可見。

## Pre-flight

- clean-boot: 候選映像先以隔離容器 `rabbit-news-candidate` 在 3011 啟動，Next.js ready；authenticated `/news` 200，首頁與 AI 文章都含 Grok 4.6，之後才替換正式容器。cc 修正後的最終正式映像為 `sha256:431ae5165edadcb617bdc23b811ebf1fbc21f50c9a44ae7b02ae135b8569211b`，再跑一次同樣 smoke 通過。
- env diff: 本次沒有新增或變更環境變數。既有 compose 中未列於 `.env` 的變數均有預設值或由宿主環境提供；News 必要的 `GEMINI_API_KEY`、`TAVILY_API_KEY`、`SITE_PASSWORD` 已存在（只核對名稱，未記錄值）。
- backup: `backups/20260820-incident-news-missed-grok-46/db.dump`，2026-08-20 10:18，PostgreSQL custom-format 完整備份；本次無 schema／資料修改，正常回復不需還原 DB。
- pre-deploy verification: `npm run test:news` 3/3 通過；ESLint、TypeScript、`next build` 通過。

## Rollback plan（部署前寫定）

部署前把目前線上映像 `sha256:dae98ae8d6e3488f5e0b0684b3bded9b3bac6010d8fd39d6c2dfbe8d6784181b` 標記為 `christophers-rabbit-hole-web:rollback-news-20260820`。若新容器 smoke 失敗：

```bash
docker tag christophers-rabbit-hole-web:rollback-news-20260820 christophers-rabbit-hole-web:latest
docker compose up -d --no-deps --force-recreate web
docker compose ps web
```

接著用容器內驗證請求確認 `/news` 回到舊版。DB 未變更，不執行資料還原；若意外發現資料受影響，使用事故目錄內的 `db.dump` 搭配 `pg_restore` 另行還原。

## Deploy

- `docker compose build web`
- `docker compose up -d --no-deps --force-recreate web`
- 只重建／替換 `christophers-rabbit-hole-web-1`；沒有重啟 Docker、OrbStack、backend 或 db。

## Smoke 結果

- `docker compose ps web`：web 正常 Up，3008 維持綁定。
- `GET /login`：200。
- authenticated `/api/model-releases?month=2026-08`：200，包含 Grok 4.6。
- authenticated `/news`：200，直接包含 Grok 4.6、AI、Taiwan Market。
- 從首頁取得 `/news/article/ai-2026-08-20` 並讀取：200，正文包含 Grok 4.6。
- browser interaction：展開 Grok 4.6 詳情、首頁點進 AI 文章均通過；console 0 errors。
- desktop 1440×900、mobile 390×844 截圖存於 `.ui-evidence/20260820-news-ai-coverage/`。

## 異常／殘留風險

- 動態官方掃描仍是 24 小時 cache；新發布最慢隔日進入每日文章。已用 verified release floor 避免 Grok 4.6 在搜尋／生成失敗時消失。
- Docker build 的 `npm ci` 回報既有 dependency advisories（1 moderate、6 high）；本次未改依賴版本，另案處理。
