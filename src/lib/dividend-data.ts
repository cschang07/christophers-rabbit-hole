import { unstable_cache } from "next/cache";
import { dividend0050Fallback, next0050ExDate } from "@/data/dividend-fallback";
import type { DividendRecord, YieldData } from "@/lib/types";

const FINMIND = "https://api.finmindtrade.com/api/v4/data";

interface FinMindDividendRow {
  date: string;
  stock_id: string;
  CashEarningsDistribution?: number;
  StockEarningsDistribution?: number;
}

async function fetchDividendsRaw(): Promise<DividendRecord[]> {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 4);
  const startStr = start.toISOString().slice(0, 10);
  const url = `${FINMIND}?dataset=TaiwanStockDividend&data_id=0050&start_date=${startStr}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error("finmind dividend failed");
  const json = await res.json();
  const rows: FinMindDividendRow[] = json.data ?? [];
  return rows
    .map((r) => ({
      exDate: r.date,
      amount: Number(r.CashEarningsDistribution ?? 0),
    }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.exDate.localeCompare(a.exDate));
}

const cachedDividends = unstable_cache(
  fetchDividendsRaw,
  ["0050-dividends"],
  { revalidate: 86400 },
);

export async function fetchYieldData(currentPrice: number): Promise<YieldData> {
  let history: DividendRecord[];
  let source: "finmind" | "fallback" = "finmind";
  try {
    history = (await cachedDividends()).slice(0, 4);
    if (history.length === 0) throw new Error("empty");
  } catch {
    history = dividend0050Fallback;
    source = "fallback";
  }

  const now = Date.now();
  const ONE_YEAR_MS = 365 * 24 * 3600 * 1000;
  const ttm = history
    .filter((r) => now - new Date(r.exDate).getTime() < ONE_YEAR_MS)
    .reduce((sum, r) => sum + r.amount, 0);

  const annualYield =
    currentPrice > 0 ? Number(((ttm / currentPrice) * 100).toFixed(2)) : 0;

  return {
    asOf: new Date().toISOString().slice(0, 10),
    currentPrice,
    ttmDividend: Number(ttm.toFixed(2)),
    annualYield,
    history,
    nextExDate: next0050ExDate.date,
    nextExNote: next0050ExDate.note,
    source,
  };
}
