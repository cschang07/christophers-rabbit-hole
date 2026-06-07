import type { HoldingsData } from "@/lib/types";

// Source: https://www.yuantaetfs.com/product/detail/0050/ric
export const holdings0050: HoldingsData = {
  asOf: "2026-Q1 (placeholder — 待 v2 接動態資料)",
  source: "元大投信",
  topHoldings: [
    { rank: 1, symbol: "2330", name: "台積電", weight: 49.5, sector: "半導體" },
    { rank: 2, symbol: "2317", name: "鴻海", weight: 5.2, sector: "電子製造" },
    { rank: 3, symbol: "2454", name: "聯發科", weight: 4.1, sector: "半導體" },
    { rank: 4, symbol: "2382", name: "廣達", weight: 3.0, sector: "電子製造" },
    { rank: 5, symbol: "2308", name: "台達電", weight: 2.3, sector: "電子零組件" },
    { rank: 6, symbol: "2881", name: "富邦金", weight: 2.1, sector: "金融" },
    { rank: 7, symbol: "2882", name: "國泰金", weight: 1.9, sector: "金融" },
    { rank: 8, symbol: "2412", name: "中華電", weight: 1.7, sector: "電信" },
    { rank: 9, symbol: "2303", name: "聯電", weight: 1.6, sector: "半導體" },
    { rank: 10, symbol: "2891", name: "中信金", weight: 1.4, sector: "金融" },
  ],
  totalWeight: 72.8,
};
