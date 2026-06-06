import type { OutlookData, OutlookDirection, OutlookHorizon } from "@/lib/types";

const DIRECTION_COLOR: Record<OutlookDirection, string> = {
  極空: "#dc2626",
  偏空: "#f97316",
  中性: "#a8a29e",
  偏多: "#14b8a6",
  極多: "#0f766e",
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="relative mt-3 h-1.5 rounded-full bg-stone-100">
      <div
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
        style={{ left: `${score}%`, backgroundColor: color }}
      />
    </div>
  );
}

function HorizonCard({ horizon }: { horizon: OutlookHorizon }) {
  const color = DIRECTION_COLOR[horizon.direction];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-stone-400">
          {horizon.label}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: `${color}14`, color }}
        >
          {horizon.direction}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-serif text-4xl tracking-tight text-stone-900">
          {horizon.score}
        </span>
        <span className="text-sm text-stone-400">/100</span>
      </div>

      <ScoreBar score={horizon.score} color={color} />

      <p className="mt-4 text-sm leading-relaxed text-stone-700">{horizon.briefing}</p>
      <p className="mt-2 text-xs text-stone-400">主因：{horizon.driver}</p>
    </div>
  );
}

export function OutlookStrip({ data }: { data: OutlookData }) {
  if (!data.horizons.length) {
    return (
      <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-400 shadow-sm">
        三檔位展望生成中…
      </section>
    );
  }
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-stone-400">
          三檔位展望
        </h2>
        <span className="text-[11px] text-stone-400">As of {data.asOf}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {data.horizons.map((h) => (
          <HorizonCard key={h.id} horizon={h} />
        ))}
      </div>
    </section>
  );
}
