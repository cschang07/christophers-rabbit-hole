"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OutlookData } from "@/lib/types";

type Tab = "price" | "flow" | "tsmc";

const TABS: { id: Tab; label: string }[] = [
  { id: "price", label: "0050 vs 台股加權" },
  { id: "flow", label: "外資 / 投信籌碼" },
  { id: "tsmc", label: "台積電 (權重 48%)" },
];

export function OutlookCharts({ data }: { data: OutlookData }) {
  const [tab, setTab] = useState<Tab>("price");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="mb-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
              tab === t.id
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="h-64 w-full">
        {!mounted && <div className="h-full w-full animate-pulse rounded-lg bg-stone-50" />}
        {mounted && tab === "price" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.priceSeries}>
              <XAxis dataKey="date" stroke="#a8a29e" fontSize={11} />
              <YAxis
                yAxisId="left"
                stroke="#0f766e"
                fontSize={11}
                domain={["dataMin - 5", "dataMax + 5"]}
                tickFormatter={(v) => `${v}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#6366f1"
                fontSize={11}
                domain={["dataMin - 500", "dataMax + 500"]}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip
                formatter={(value, name) => {
                  const n = Number(value);
                  if (name === "taiex") return [n.toLocaleString(), "台股加權"];
                  if (name === "price") return [n, "0050"];
                  return [n, String(name)];
                }}
              />
              <Legend
                formatter={(value) =>
                  value === "price"
                    ? "0050"
                    : value === "taiex"
                      ? "台股加權"
                      : value
                }
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="price"
                name="price"
                stroke="#0f766e"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="ma20"
                name="ma20"
                stroke="#a8a29e"
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="ma60"
                name="ma60"
                stroke="#d6d3d1"
                strokeDasharray="2 2"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="taiex"
                name="taiex"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        {mounted && tab === "flow" && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.flowSeries}>
              <XAxis dataKey="date" stroke="#a8a29e" fontSize={11} />
              <YAxis stroke="#a8a29e" fontSize={11} />
              <Tooltip />
              <ReferenceLine y={0} stroke="#d6d3d1" />
              <Area
                type="monotone"
                dataKey="foreign"
                stroke="#dc2626"
                fill="#fecaca"
                fillOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="trust"
                stroke="#0f766e"
                fill="#99f6e4"
                fillOpacity={0.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {mounted && tab === "tsmc" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.tsmcSeries}>
              <XAxis dataKey="date" stroke="#a8a29e" fontSize={11} />
              <YAxis
                stroke="#a8a29e"
                fontSize={11}
                domain={["dataMin - 30", "dataMax + 30"]}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
