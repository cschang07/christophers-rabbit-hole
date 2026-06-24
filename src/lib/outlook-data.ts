import { GoogleGenAI, Type } from "@google/genai";
import { unstable_cache } from "next/cache";
import { getArticlesByTheme } from "@/data/editions";
import type {
  FlowPoint,
  OutlookData,
  OutlookDirection,
  OutlookHorizon,
  PricePoint,
  TsmcPoint,
} from "@/lib/types";

const YF = "https://query2.finance.yahoo.com/v8/finance/chart";
const FINMIND = "https://api.finmindtrade.com/api/v4/data";
const UA = { "User-Agent": "Mozilla/5.0" };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface YahooResult {
  timestamp: number[];
  indicators: { quote: [{ close: (number | null)[] }] };
}

async function yahooDaily(symbol: string): Promise<YahooResult | null> {
  try {
    const res = await fetch(`${YF}/${symbol}?range=1y&interval=1d`, {
      headers: UA,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.chart?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

function ma(closes: number[], window: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < window - 1) return null;
    const slice = closes.slice(i - window + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / window;
  });
}

function fmtMonth(ts: number) {
  const d = new Date(ts * 1000);
  return `${String(d.getFullYear()).slice(2)}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtMD(date: string) {
  const [, m, d] = date.split("-");
  return `${m}/${d}`;
}

function sample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr;
  const step = Math.floor(arr.length / target);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

interface FinMindFlowRow {
  date: string;
  stock_id: string;
  buy: number;
  sell: number;
  name: string;
}

async function fetchFlow(): Promise<FlowPoint[]> {
  const start = new Date();
  start.setDate(start.getDate() - 45);
  const startStr = start.toISOString().slice(0, 10);

  const url = `${FINMIND}?dataset=TaiwanStockInstitutionalInvestorsBuySell&data_id=0050&start_date=${startStr}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const json = await res.json();
  const rows: FinMindFlowRow[] = json.data ?? [];

  // Group by date, sum foreign vs trust net (in 億 = 100M TWD)
  const byDate = new Map<string, { foreign: number; trust: number }>();
  for (const r of rows) {
    const net = (r.buy - r.sell) / 1e8;
    const slot = byDate.get(r.date) ?? { foreign: 0, trust: 0 };
    if (r.name === "Foreign_Investor" || r.name === "Foreign_Dealer_Self") {
      slot.foreign += net;
    } else if (r.name === "Investment_Trust") {
      slot.trust += net;
    }
    byDate.set(r.date, slot);
  }

  const sorted = Array.from(byDate.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  // Cumulative
  let cumF = 0;
  let cumT = 0;
  const points: FlowPoint[] = sorted.map(([date, v]) => {
    cumF += v.foreign;
    cumT += v.trust;
    return {
      date: fmtMD(date),
      foreign: Number(cumF.toFixed(1)),
      trust: Number(cumT.toFixed(1)),
    };
  });

  return points.slice(-25);
}

const DIRECTIONS: OutlookDirection[] = [
  "極空",
  "偏空",
  "中性",
  "偏多",
  "極多",
];

async function generateHorizons(
  currentPrice: number,
  m1Change: number,
  m3Change: number,
  y1Change: number,
  vsMa20: number,
  vsMa60: number,
  recentFlowDirection: string,
  articleSummary: string,
): Promise<OutlookHorizon[]> {
  const prompt = `你是專業 ETF 分析師。根據以下 0050 的現況，給出三個時間區間的展望分數與一句話評論。

【市場數據】
- 現價：${currentPrice.toFixed(2)} TWD
- 近 1 個月變化：${m1Change.toFixed(1)}%
- 近 3 個月變化：${m3Change.toFixed(1)}%
- 近 1 年變化：${y1Change.toFixed(1)}%
- 現價 vs MA20：${vsMa20 > 0 ? "+" : ""}${vsMa20.toFixed(1)}%
- 現價 vs MA60：${vsMa60 > 0 ? "+" : ""}${vsMa60.toFixed(1)}%
- 近期法人籌碼：${recentFlowDirection}

【今日新聞摘要】
${articleSummary}

請對以下三個時間區間各給：
1. score（0-100，0=極空，50=中性，100=極多）
2. direction（極空 / 偏空 / 中性 / 偏多 / 極多）
3. briefing（一句話 30-50 字，不要寫死具體價位數字）
4. driver（10-20 字，列出主因）

時間區間：
- 一個月（1m，看短期技術面與法人籌碼）
- 一季（1q，看除息、Fed 會議、季報）
- 一年以上（1y，看長線結構性趨勢）`;

  const result = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          horizons: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, enum: ["1m", "1q", "1y"] },
                label: { type: Type.STRING },
                score: { type: Type.NUMBER },
                direction: { type: Type.STRING, enum: DIRECTIONS },
                briefing: { type: Type.STRING },
                driver: { type: Type.STRING },
              },
              required: ["id", "label", "score", "direction", "briefing", "driver"],
            },
          },
        },
        required: ["horizons"],
      },
    },
  });

  const parsed = JSON.parse(result.text ?? "{}");
  return parsed.horizons as OutlookHorizon[];
}

const cachedHorizons = unstable_cache(
  generateHorizons,
  ["outlook-horizons-0050"],
  { revalidate: 86400 },
);

export async function fetchOutlookData(): Promise<OutlookData> {
  const [etf, taiex, tsmc, flowSeries] = await Promise.all([
    yahooDaily("0050.TW"),
    yahooDaily("%5ETWII"),
    yahooDaily("2330.TW"),
    fetchFlow(),
  ]);

  if (!etf || !taiex || !tsmc) {
    throw new Error("Failed to fetch market data");
  }

  const etfCloses = etf.indicators.quote[0].close
    .map((v, i) => ({ ts: etf.timestamp[i], close: v }))
    .filter((p): p is { ts: number; close: number } => p.close != null);

  const closes = etfCloses.map((p) => p.close);
  const ma20arr = ma(closes, 20);
  const ma60arr = ma(closes, 60);

  const taiexCloses = taiex.indicators.quote[0].close;
  const tsmcCloses = tsmc.indicators.quote[0].close;

  const pricePointsFull: PricePoint[] = etfCloses.map((p, i) => ({
    date: fmtMonth(p.ts),
    price: Number(p.close.toFixed(2)),
    ma20: ma20arr[i] != null ? Number((ma20arr[i] as number).toFixed(2)) : p.close,
    ma60: ma60arr[i] != null ? Number((ma60arr[i] as number).toFixed(2)) : p.close,
    taiex: Number((taiexCloses[i] ?? 0).toFixed(0)),
  }));

  const tsmcPointsFull: TsmcPoint[] = tsmc.timestamp
    .map((ts, i) => ({
      date: fmtMonth(ts),
      price: Number((tsmcCloses[i] ?? 0).toFixed(2)),
    }))
    .filter((p) => p.price > 0);

  const priceSeries = sample(pricePointsFull, 50);
  const tsmcSeries = sample(tsmcPointsFull, 50);

  // Compute stats for horizon prompt
  const last = closes[closes.length - 1];
  const m1 = closes[Math.max(0, closes.length - 21)];
  const m3 = closes[Math.max(0, closes.length - 63)];
  const y1 = closes[0];
  const ma20Last = ma20arr[ma20arr.length - 1] as number;
  const ma60Last = ma60arr[ma60arr.length - 1] as number;

  const flowSum = flowSeries.length
    ? flowSeries[flowSeries.length - 1].foreign - flowSeries[0].foreign
    : 0;
  const flowDirection =
    flowSum < -10
      ? "外資累積大幅賣超"
      : flowSum < 0
        ? "外資小幅賣超"
        : flowSum < 10
          ? "外資小幅買超"
          : "外資累積買超";

  const [article] = await getArticlesByTheme("theme-0050");
  const articleSummary = article
    ? `${article.title}。${article.dek}`
    : "今日無 0050 相關新聞摘要可參考。";

  let horizons: OutlookHorizon[];
  try {
    horizons = await cachedHorizons(
      last,
      ((last - m1) / m1) * 100,
      ((last - m3) / m3) * 100,
      ((last - y1) / y1) * 100,
      ((last - ma20Last) / ma20Last) * 100,
      ((last - ma60Last) / ma60Last) * 100,
      flowDirection,
      articleSummary,
    );
  } catch (e) {
    console.error("Gemini horizon generation failed:", e);
    horizons = [];
  }

  return {
    asOf: new Date().toISOString().slice(0, 10),
    horizons,
    priceSeries,
    flowSeries,
    tsmcSeries,
  };
}
