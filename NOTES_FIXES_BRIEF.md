# Notes 功能修復 + 升級 — Cursor 實作 brief

決策/review 由 Claude Code 出，實作交 Cursor。**全部驗證在容器 `http://localhost:3008`，不要開 host dev server（見 AGENTS.md）。**

涉及檔案：
- `src/app/(app)/notes/page.tsx`（編輯器/清單/錄音 UI）
- `src/context/recorder.tsx`（前端錄音）
- `src/app/globals.css`（樣式，`.markdown-preview` 在 ~205 行起）
- `backend/app/transcribe.py`（Gemini 轉錄）
- `backend/app/routers/recordings.py`、`backend/app/routers/notes*.py`
- `backend/app/models.py`、`backend/app/main.py`（`Base.metadata.create_all`，**無 Alembic**）

> ⚠️ 重要：`create_all` 只建新表、**不會對既有表加欄位**。任何新欄位（如 `pinned`）要自己加 idempotent 的 `ALTER TABLE ... IF NOT EXISTS`（在 `main.py` 啟動時跑，或一支 SQL）。

---

## Phase 1 — Bug 修復

### 1a. 預覽清單/格式消失（CSS）
**根因**：Tailwind v4 Preflight（`globals.css:1` 的 `@import "tailwindcss"`）全域 reset `ol/ul { list-style:none; margin:0; padding:0 }`，`.markdown-preview` 沒加回來，所以 `1. 2.`、項目符號、縮排全消失。
**改 `globals.css`，在 `.markdown-preview` 規則群組內補：**
```css
.markdown-preview :is(ul, ol) { list-style: revert; padding-left: 1.5em; margin: 0.4em 0; }
.markdown-preview li { margin: 0.2em 0; }
.markdown-preview p { margin: 0.5em 0; }
```
行首空格折疊是 Markdown 正常語意，**不要**加 `white-space: pre`。

### 1b. 標題寫死 "Untitled" / 看不出可編輯
**根因**：`models.py` 的 `Note.title` DB default = `"Untitled"`，新筆記實際存了 "Untitled"；加上 `editor-title`（`globals.css:199`）無邊框、22px 粗體，看起來像靜態標題。
**做：**
1. 新筆記改存空標題：`Note.title` default 改 `""`（同時把 `recordings.py`/`transcribe.py` 既有設標題邏輯維持不變）。
2. `editor-title` 加可編輯提示：focus 時顯示底線、hover 微底色（改 `globals.css`）。
3. 存檔時若 `title` 為空，自動取 `content` 第一行（去掉開頭 `#`、trim、截 120 字）當標題。清單顯示維持 `n.title || 'Untitled'` fallback（`page.tsx:225`）。

### 1c. 錄音失敗（Gemini 429 `file_storage_bytes` 額度爆）
**根因**：`transcribe.py` 用 Gemini Files API 上傳音檔但**從不刪除**，免費額度 ~20MB 儲存被歷史檔塞爆 → `429 RESOURCE_EXHAUSTED`。
**做：**
1. `_gemini_transcribe`：把上傳檔的刪除放進 `finally`：
   ```python
   uploaded = client.files.upload(file=str(mp3))
   try:
       # ...等待 ACTIVE、generate_content...
       return text
   finally:
       try:
           client.files.delete(name=uploaded.name)
       except Exception:
           pass
   ```
2. 寫一支一次性清理（或在 `process_recording` 開頭跑一次）：`for f in client.files.list(): client.files.delete(name=f.name)`，先把現有殘檔清空釋放額度，否則 retry 仍 429。
3. 429 錯誤訊息白話化：偵測 `RESOURCE_EXHAUSTED` 時存「Gemini 額度用罄，已清理暫存，請稍後重試」。

---

## Phase 2 — 體驗升級（**不做 split preview**）

### 2a. Markdown 工具列
編輯區（`page.tsx` textarea 上方）加按鈕列：**B / I / H1 / 清單 / 連結 / 代碼**。操作 textarea 的 selection 包字串（`**`/`*`/`# `/`- `/`[ ]( )`/`` ` ``），改完觸發既有 `edit({content})`。

### 2b. 存檔狀態 + 衝突保護
- 存檔狀態 UI 更明顯（已有 `saveState`，加顏色/icon）。
- 樂觀鎖：`PUT /notes/{id}` 帶 client 端 `updated_at`；後端比對 DB `updated_at`，不符回 `409`；前端收到 409 提示「此筆記在他處被修改，請重新整理」。

### 2c. 筆記清單
- **排序**：`GET /notes` 預設依 `updated_at DESC`（已有欄位，免 migration）。釘選的排最上。
- **釘選**：`Note` 加 `pinned: bool default False` → **需 ALTER**（在 `main.py` 啟動加 `ALTER TABLE notes ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false`）。清單每筆加釘選 toggle，API 支援 `PUT /notes/{id}` 改 `pinned`。
- **Folder 拖放**：清單筆記可拖到左側 folder → `PUT /notes/{id}` 改 `folder_id`。
- **Tag 自動完成**：tags input 接 `<datalist>`，來源沿用既有 `GET /notes/tags`。

### 2d. 錄音強化（最重，排最後）
- 上傳進度：`recorder.tsx` 的 `fetch` 換 `XMLHttpRequest` 取 `upload.onprogress`，UI 顯示百分比。
- 處理中可取消/丟棄（已有 `DELETE /recordings/{id}`，補一個 cancel 入口）。
- 長音檔分段：超過 ~30 分鐘按時間切段、分段送 Gemini、合併 transcript。**先確認需求再做。**

---

## 驗證
- 前端改動：容器 hot reload，開 `http://localhost:3008/notes` 檢查。
- 後端改動：rebuild `backend` container。
- 錄音：先跑 1c 的清理釋放額度，再實錄一段短音檔確認轉錄成功。
- 跑型別檢查 / lint，PR 前確認 `docker ps` 沒打掛其他 stack。
