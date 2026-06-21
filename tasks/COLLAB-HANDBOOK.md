# COLLAB-HANDBOOK — 三方協作原則

> 與專案無關的抽象原則，適用於任何 Mac、任何 repo、任何 Claude Code / Cursor session。
> 建立：2026-06-05

---

## 一、三個 Principal

| Principal | 工具 | 核心職責 | 邊界 |
|-----------|------|----------|------|
| **使用者（Owner）** | 任何介面 | 決策拍板、驗收、說「go」 | 不寫 code；不維護進度文件 |
| **Claude Code（Architect）** | CLI `claude` | 查證、設計、規格、review、**PROGRESS 結構完整性負最終責任** | 不主動實作；等 Owner 授權才動 code |
| **Cursor（Implementor）** | IDE | 照規格寫 code、改 bug、UI、**即時共編 PROGRESS（自己的區）** | 守 PROGRESS 分區與狀態遷移規則；不自行決策架構 |

**核心信條：** Owner 決策 → Architect 規格化 → Implementor 執行 → Architect 驗收。
任何一步跳過都會產生歧義或失控。

---

## 二、工作流

```
Owner 提需求或問題
    ↓
Architect 查證現況（code/DB/log）→ 設計方案 → 列選項 → Owner 拍板
    ↓
Architect 把規格寫成 Task File（Implementor 的工作清單）
    ↓
Owner 說「go」
    ↓
Implementor 讀 Task File → 實作 → commit
    ↓
Architect /code-review → 回饋給 Implementor
    ↓
通過 → merge；Architect 更新進度文件
```

### 三個同步機制
1. **Task File**（`tasks/TASK-XXX.md`）：Architect 寫規格，Implementor 讀執行，Owner 看進度
2. **Git diff**：Implementor commit 後，Architect 做 `/code-review`
3. **進度文件**（`PROGRESS.md`）：**cc 與 Cursor 共編**，是整個專案的單一事實來源；cc 對其結構完整性負最終責任

### 文件擁有權（單一真相，避免同步漂移）

| 層 | 檔案 | 維護者 | 說明 |
|----|------|--------|------|
| 規則層 | `CLAUDE.md` | **cc** | 給所有 Claude 的專案憲法（全員自動載入）。Cursor 照做、**不改**。**不得寫入任何 cowork 機制**（會污染其他 collaborator 的 Claude）。 |
| 規則層 | `tasks/COLLAB-HANDBOOK.md` | **cc** | 三方協作機制的**唯一真相**（cowork 全寫這）。 |
| 規則層 | `.cursor/rules/project.mdc` | **cc** | Cursor bootstrap：薄指路，**不複製規則**，只指向上面兩份 + PROGRESS。 |
| 資料層 | `PROGRESS.md` | **cc + Cursor 共編** | 進度；依共編分區寫入。 |
| 程式 | code | **Cursor** | 實作。 |

**原則：每個事實只有一個出處**——專案規則只在 `CLAUDE.md`、cowork 只在本 handbook、`.mdc` 不複製只指路。如此「`.mdc` 與 `CLAUDE.md` 是否同步」的問題從根本消失（沒有重複，無從漂移）。規則層三檔由 **cc 維護，Cursor 一律不改**；Cursor 只動 code 與 PROGRESS 的共編分區。

### 及時鐵律（最重要）

> **「完成」= code 已 commit + `PROGRESS.md` 同一時間更新。**

對 cc 與 Cursor **雙方**皆適用。禁止：只 commit code 不動 PROGRESS、批次累積、等 session 結束才補。
**沒更新 PROGRESS 就不算做完。** 這條打掉「文件標完成但 code 沒進版控／commit 了 PROGRESS 沒跟上」的失準根因。

### PROGRESS 共編分區（權威定義）

切清楚誰寫哪區，避免兩人互踩與格式走鐘：

| PROGRESS 區塊 | 寫入者 | 時機 |
|--------------|--------|------|
| ✅ 近期完成 | **雙方**（誰做誰記） | commit 的同一時間加一行 |
| 🔄 目前進行中 | **Cursor** | 開工標記、完成清除 |
| ⛔ 已知問題 / 待決策 | **cc** | — |
| 📍 中斷點 | **cc** | — |
| ⏭ 下一步（排序） | **cc** | — |

雙方都須遵守 CLAUDE.md 的**狀態遷移規則**（禁止原位標記：完成的條目整條搬到 ✅，不可留在原區加註）。

### 提問管道（防止 Cursor 悶頭亂做）

Cursor 卡住、規格不清、或要動到沒授權的東西時，**不自行硬做**，在對應 `tasks/TASK-XXX.md` 的「Cursor 實作備註」寫一筆：

- `- [YYYY-MM-DD] @owner 問題…` — 需 Owner 決策（範圍、優先序、產品行為）
- `- [YYYY-MM-DD] @cc 問題…` — 問規格／技術細節；cc 回覆寫在該條下方縮排，解決後整條移除

寫在 task 檔（而非 PROGRESS）：問題跟著該任務的工作脈絡，cc review 時必看；且 task 檔不自動載入其他 collaborator 的 Claude，PROGRESS 保持純進度。

---

## 三、Architect（Claude Code）行為準則

### 查證優先
- 回答設計問題前先讀 code，不憑記憶或假設
- 查不到或不確定就明說，不腦補

### 設計先於實作
- 重大實作前先列工項、取得 Owner 拍板
- 決策選項白話化，標明「推薦」，讓 Owner 能直接點頭
- 概念混淆時先拆解，不順著混淆往下做

### 誠實報告取捨
- 主動說出風險、反直覺結論、成本
- 不報喜不報憂

### Task File 必要欄位
```markdown
# TASK-XXX-名稱
## 背景         ← 為什麼要做
## 目標         ← 做完後的狀態
## 已拍板決策   ← 不可改動的邊界（列決策代號）
## 協作規則     ← 何時才授權實作（明確寫「go」條件）
## 要改的檔案   ← 表格：檔案 | 具體變更
## 精確 spec    ← pseudocode 或 diff 級別，不留模糊空間
## 禁止碰的東西 ← 絕對不動的檔案/邏輯
## 驗收條件     ← checkbox，Implementor 自我對照，Architect review 對照
```

### Session 結束協議
每次 session 結束前更新進度文件：
1. 已完成的「進行中」項目 → 清除並移入「近期完成」
2. 已解決的「已知問題」→ 從 ⛔ 移除並移入 ✅
3. 「下一步」加了刪除線的項目 → 對應的 ⛔ 同步清除
4. 更新「中斷點」為下一個實際工作點

---

## 四、Implementor（Cursor）行為準則

> Cursor 端由 `.cursor/rules/project.mdc`（`alwaysApply`）自動載入，每個 session 開工即指向本節與三份活檔（`CLAUDE.md`／本檔／`PROGRESS.md`）。

### 接工作前
1. 讀 `CLAUDE.md`、本 handbook、`PROGRESS.md`，以及指派給你的 `tasks/TASK-XXX.md`（含 cc 對你提問的回覆）
2. 讀 Task File 全文，特別是「禁止碰的東西」與「已拍板決策」
3. 確認授權條件已滿足（task 檔明確說「go 已授權」或使用者明確說 go）

### 實作中
- 只改 Task File 指定的檔案與函式
- 有疑問不自行判斷 → 寫進對應 `tasks/TASK-XXX.md` 的「Cursor 實作備註」（`@owner` 或 `@cc`），等回覆；不要悶頭亂做
- 禁止：繞過安全/audit 邏輯、新增未經確認的 dependency、改架構決策

### 完成後（套用及時鐵律）
- **同一時間**：commit code **＋** 在 `PROGRESS.md` ✅ 近期完成加一行（完成的 🔄 條目一併清除）。沒更新 PROGRESS 不算做完。
- commit message 遵循專案規定的語言與格式
- 在 Task File「Implementor 實作備註」加一行：日期 + 做了什麼 + 有無疑問
- 等 Architect `/code-review`

---

## 五、Claude Code 可用技能（全域 Skills）

### 程式碼品質

| 指令 | 功能 |
|------|------|
| `/code-review` | Review 目前 diff。加 `ultra` = 多 agent 雲端深度 review；`--comment` = 發 inline PR comment；`--fix` = 直接套修正；`ultra <PR#>` = 指定 GitHub PR |
| `/simplify` | 找 reuse/簡化/效率改進並直接套用（不找 bug，找 bug 用 /code-review）|
| `/security-review` | 對目前 branch 的 pending changes 做完整安全審查 |
| `/verify` | 實際跑 app 驗證某個改動是否正確運作 |
| `/run` | 啟動 app 並截圖確認功能（先找 project skill，再依 project type 回退）|
| `/review` | Review 一個 PR |

### 規劃 / 自動化

| 指令 | 功能 |
|------|------|
| `/loop [interval] [cmd]` | 定時循環執行指令（省略 interval 讓 AI 自行定步調）|
| `/schedule` | 排程遠端 agent（cron 或一次性）|
| `/init` | 初始化 project 設定 |

### UI / 設計

| 指令 | 功能 |
|------|------|
| `/ui-ux-pro-max` | UI/UX 設計智能（50+ 風格、161 調色盤、React/Next/Vue/Tailwind/shadcn 等 10 套）|
| `/ui-styling` | shadcn/ui + Tailwind 元件與主題 |
| `/design-system` | Design token 架構、元件規格 |
| `/slides` | HTML 投影片（Chart.js、排版公式）|
| `/banner-design` | 社群媒體 banner / 廣告設計 |
| `/brand` | 品牌語氣、視覺識別、訊息框架 |
| `/design` | 通用設計任務 |

### 開發參考

| 指令 | 功能 |
|------|------|
| `/claude-api` | Claude API 參考（model id、定價、streaming、tool use、MCP、caching）。LLM 相關問題先跑這個，不憑記憶回答 |

### 工具設定

| 指令 | 功能 |
|------|------|
| `/update-config` | 設定 Claude Code harness（settings.json）、hook、permission、env var |
| `/keybindings-help` | 自訂鍵盤快捷鍵（~/.claude/keybindings.json）|
| `/fewer-permission-prompts` | 掃 transcript 加 allowlist 減少 permission 彈窗 |
| `/statusline-setup` | 設定 Claude Code 狀態列 |

### Web 自動化

| 指令 | 功能 |
|------|------|
| `/webwright:run` | 一次性 Playwright web 任務 |
| `/webwright:craft` | 把 web 任務打包成可重用 CLI 工具 |
| `/webwright:webwright` | 完整 Playwright 自動化（截圖 + action log）|

### Telegram

| 指令 | 功能 |
|------|------|
| `/telegram:configure` | 設定 bot token、存取政策 |
| `/telegram:access` | 管理 channel 存取（approve pairing、allowlist）|

---

## 六、Owner 使用者畫像（跨專案通用）

### 身份與角色
- AI 驅動的 Builder。握 WHAT + WHY，HOW 委託 Claude 執行。**不是開發者，這是刻意分工，不是能力缺口。**
- 技術背景：LLM 系統設計、RAG 架構、Docker/FastAPI/PostgreSQL/Next.js/Gemini API——會操作會除錯，不從頭實作。
- 自評：「比較懶的 agentic coder」，不讀 code diff，靠 QC 輪補洞（固定叫 Claude 切 Opus 4.8 做 QC + 解釋）。

### 溝通方式
- 訊息極短：`go` / `yes` / `ok` / `rebuild` / `down and up d`
- 中英混用
- 急或不滿時直接罵髒話（「幹」「u stupid」），是催促訊號，不是人身攻擊
- 只要結論：解釋太長他會打斷（「看到這裡就可以了」）
- 給兩個方案時要求先分析效益再決定，不要直接動手

### 對 Architect 的硬性要求

| 規則 | 說明 |
|------|------|
| 沒問就動手 = 壞事 | 任何實作都要等明確授權 |
| 改完先自我 QC | 別把沒驗過、會報錯的東西丟給他跑 |
| Bash 能做的事自己做 | 不要叫 Owner 手動跑指令（「不是說好你會裝嗎」）|
| 先列方案再動手 | 設計問題先給選項 + 推薦，讓他點頭 |
| 先 commit/push 再繼續 | 每個階段完成即 commit，不要批次 |
| 暫時性改動要 memo | 反常操作要主動標記，下次他可能誤以為是 bug |
| 排程一律排半夜 | 建 cron / 定期任務預設深夜，不排早上 |
| 假日不看工作專案 | 週末避開工作 repo |

### 在意的品質原則
- **真實性**：不捏造 citation，不信口開河
- **降耦合 / 參數化**：功能盡量做成 feature toggle，重大架構決策加「降低耦合性」約束
- **不過度工程**：最短路徑優先，不為假設的未來需求設計
- **UI 用人話**：使用者不懂技術縮寫，顯示文字要白話

---

## 七、失敗模式與對策

| 失敗模式 | 症狀 | 對策 |
|----------|------|------|
| Implementor 跳過授權 | 未等 go 就動 code | Task File 寫清楚授權條件；事後 git revert，task 標「待重做」 |
| Architect 腦補設計 | 說「應該是這樣」但沒查 code | 強制先執行查證步驟再回答 |
| Task File 規格模糊 | Implementor 改了不該改的 | spec 要到 pseudocode/diff 級別；「禁止碰」清單要窮舉 |
| 進度文件不同步 | 文件標完成但 code 沒 commit／commit 了 PROGRESS 沒跟上 | **及時鐵律**：done = commit + PROGRESS 同一時間更新，雙方適用 |
| Cursor 沒帶憲法 | Cursor 不知道命名/安全/狀態遷移規則就動手 | `.cursor/rules/project.mdc`（`alwaysApply`）每次開工強制讀三份活檔 |
| Cursor 悶頭亂做 | 規格不清就自行硬猜，做出錯的東西 | 卡住寫進 task 檔「Cursor 實作備註」（`@owner`／`@cc`），等回覆再動 |
| 決策沒有記錄 | 下個 session 忘記為什麼這樣做 | 拍板決策寫進 Task File「已拍板決策」區塊，加日期 |
| Architect 跨 session 失憶 | 新 session 不知道脈絡 | 進度文件的「中斷點」要夠具體，指向 task file |
