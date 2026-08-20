# easyasfuck review — News AI coverage

## Scope contract

In scope:

- `src/data/editions.ts`
- `src/lib/tavily.ts`
- `src/lib/model-radar.ts`
- `src/lib/news-gen.ts`
- `src/lib/news-gen.test.ts`

Excluded: 其餘 dirty／untracked 檔案共 73 項，屬既有 shell、Board、Notes、其他頁面與尚未整理的 News UI 工作；review 使用 staged mode，沒有把這些檔案混進本次邏輯審查。`src/components/model-release-table.tsx` 第一輪曾納入檢查，因其 consumer 與 API route 是既有未提交 UI 工作，第二輪從本次可獨立提交範圍移除。

Mode: normal, staged。沒有觸及 auth、權限、資料隔離、付款、secret 或 API 預算控制，不啟用 adversarial。

## Iteration 1 — fail

BLOCKING:

1. staged commit 漏掉 `src/lib/tavily.ts` 的 `includeDomains` 支援，乾淨 checkout 會 TS2353。
   - 修正：將 Tavily 官方網域 allowlist 參數一併納入 staged scope。
2. `mergeThemeSources` 以 URL 去重，會把共用一篇官方公告的 sibling models 吃掉。
   - 修正：每一筆官方 release 保持獨立，只把一般新聞中與官方 release URL 重複的來源移除；新增 shared-announcement regression test。

NON_BLOCKING：記錄 month validation、cache key 成本、官方 domain 完整度、orphan test script 等建議；本次另順手補 `blog.google` 與 `deepmind.google`，其他不擴張處理。

## Iteration 2 — pass

Focused locations: `news-gen.ts:84-99`、`model-radar.ts:38`、`tavily.ts:19-48`、`news-gen.test.ts:61-75`。

- BLOCKING: none。
- REBUTTAL: none。
- Final verdict: pass。

## Runtime evidence

- `npx tsx --test src/lib/news-gen.test.ts`: 4/4 pass。
- scoped ESLint: pass。
- `npx tsc --noEmit`: pass。
- `npm run build`: pass（Next.js 16.2.7）。
- candidate container clean boot: pass。
- production `/news`: 200，Grok 4.6／AI／Taiwan Market 可見。
- production AI article: 200，正文含 Grok 4.6。
- UI: desktop 1440×900、mobile 390×844；Grok row 展開與 AI article navigation 通過；console 0 errors。

Loop stopped because independent reviewer returned `VERDICT: pass` with no blocking findings.
