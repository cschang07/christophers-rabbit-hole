export type ThemeStatus = "active" | "empty";

export interface Theme {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: ThemeStatus;
  accent: string;
  icon: string;
}

export interface Citation {
  id: string;
  label: string;
  url: string;
}

export interface ArticleSection {
  id: string;
  heading: string;
  paragraphs: string[];
  citationIds: string[];
}

export interface Article {
  id: string;
  themeId: string;
  slug: string;
  title: string;
  dek: string;
  publishedAt: string;
  readMinutes: number;
  sourceCount: number;
  sections: ArticleSection[];
  citations: Citation[];
  relatedSlugs: string[];
}

export interface Edition {
  date: string;
  label: string;
  themes: Theme[];
  articles: Article[];
}

export type OutlookDirection = "極空" | "偏空" | "中性" | "偏多" | "極多";

export interface OutlookHorizon {
  id: "1m" | "1q" | "1y";
  label: string;
  score: number;
  direction: OutlookDirection;
  briefing: string;
  driver: string;
}

export interface PricePoint {
  date: string;
  price: number;
  ma20: number;
  ma60: number;
  taiex: number;
}

export interface FlowPoint {
  date: string;
  foreign: number;
  trust: number;
}

export interface TsmcPoint {
  date: string;
  price: number;
}

export interface OutlookData {
  asOf: string;
  horizons: OutlookHorizon[];
  priceSeries: PricePoint[];
  flowSeries: FlowPoint[];
  tsmcSeries: TsmcPoint[];
}

export interface Holding {
  rank: number;
  symbol: string;
  name: string;
  weight: number;
  sector: string;
}

export interface HoldingsData {
  asOf: string;
  source: string;
  topHoldings: Holding[];
  totalWeight: number;
}

export interface DividendRecord {
  exDate: string;
  amount: number;
  payDate?: string;
}

export interface YieldData {
  asOf: string;
  currentPrice: number;
  ttmDividend: number;
  annualYield: number;
  history: DividendRecord[];
  nextExDate: string | null;
  nextExNote: string;
  source: "finmind" | "fallback";
}

export interface PositionData {
  shares: number;
  avgCost: number;
}
