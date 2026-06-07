import type { DividendRecord } from "@/lib/types";

// Source: 元大公告，最後更新 2026-06-07
export const dividend0050Fallback: DividendRecord[] = [
  { exDate: "2025-07-17", amount: 4.6, payDate: "2025-08-08" },
  { exDate: "2025-01-22", amount: 1.0, payDate: "2025-02-18" },
  { exDate: "2024-07-19", amount: 4.6, payDate: "2024-08-09" },
  { exDate: "2024-01-22", amount: 1.0, payDate: "2024-02-18" },
];

export const next0050ExDate = {
  date: "2026-07-17",
  note: "歷史慣例推估，元大正式公告日 TBD",
};
