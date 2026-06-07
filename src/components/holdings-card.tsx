import { holdings0050 } from "@/data/holdings-0050";

const SECTOR_COLOR: Record<string, string> = {
  半導體: "#0f766e",
  電子製造: "#3b82f6",
  電子零組件: "#6366f1",
  金融: "#f59e0b",
  電信: "#a855f7",
};

export function HoldingsCard() {
  const data = holdings0050;
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          前 10 大持股
        </h2>
        <span className="text-[11px] text-stone-400">
          {data.source} · {data.asOf}
        </span>
      </div>

      <ul className="space-y-1.5">
        {data.topHoldings.map((h) => {
          const color = SECTOR_COLOR[h.sector] ?? "#a8a29e";
          return (
            <li key={h.symbol} className="flex items-center gap-3 text-sm">
              <span className="w-4 text-right text-xs text-stone-400">{h.rank}</span>
              <span className="w-12 font-mono text-xs text-stone-500">{h.symbol}</span>
              <span className="min-w-0 flex-1 truncate text-stone-800">{h.name}</span>
              <div className="relative h-1.5 w-24 rounded-full bg-stone-100">
                <div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (h.weight / data.topHoldings[0].weight) * 100)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <span className="w-12 text-right font-mono text-xs text-stone-700">
                {h.weight.toFixed(1)}%
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] text-stone-400">
        Top 10 合計約 {data.totalWeight.toFixed(1)}% · 其餘 40 檔分散
      </p>
    </section>
  );
}
