import type { YieldData } from "@/lib/types";

export function YieldCard({ data }: { data: YieldData }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          配息與殖利率
        </h2>
        <span className="text-[11px] text-stone-400">
          {data.source === "finmind" ? "FinMind" : "備援資料"} · {data.asOf}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-stone-400">年化殖利率</p>
          <p className="mt-1 font-serif text-3xl tracking-tight text-stone-900">
            {data.annualYield.toFixed(2)}
            <span className="text-base text-stone-400">%</span>
          </p>
          <p className="mt-1 text-[11px] text-stone-400">
            近 12 月配息 {data.ttmDividend.toFixed(2)} 元 / 現價{" "}
            {data.currentPrice.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-stone-400">下次預估除息</p>
          <p className="mt-1 font-serif text-xl tracking-tight text-stone-900">
            {data.nextExDate ?? "—"}
          </p>
          <p className="mt-1 text-[11px] text-stone-400">{data.nextExNote}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-stone-100 pt-3">
        <p className="mb-2 text-[11px] uppercase tracking-widest text-stone-400">
          近 4 次配息
        </p>
        <ul className="space-y-1">
          {data.history.map((d) => (
            <li
              key={d.exDate}
              className="flex items-baseline justify-between text-xs text-stone-700"
            >
              <span className="font-mono text-stone-500">{d.exDate}</span>
              <span className="font-mono">{d.amount.toFixed(2)} 元/股</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
