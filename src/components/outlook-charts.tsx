"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OutlookData } from "@/lib/types";
import { outlook0050 } from "@/data/outlook";

type Tab = "price" | "flow" | "tsmc";

const TABS: { id: Tab; label: string }[] = [
  { id: "price", label: "0050 價格與均線" },
  { id: "flow", label: "外資 / 投信籌碼" },
  { id: "tsmc", label: "台積電 (權重 48%)" },
];

export function OutlookCharts({ data = outlook0050 }: { data?: OutlookData }) {
  const [tab, setTab] = useState<Tab>("price");

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
        <ResponsiveContainer width="100%" height="100%">
          {tab === "price" && (
            <LineChart data={data.priceSeries}>
              <XAxis dataKey="date" stroke="#a8a29e" fontSize={11} />
              <YAxis
                stroke="#a8a29e"
                fontSize={11}
                domain={["dataMin - 5", "dataMax + 5"]}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#0f766e"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="ma20"
                stroke="#a8a29e"
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="ma60"
                stroke="#d6d3d1"
                strokeDasharray="2 2"
                dot={false}
              />
            </LineChart>
          )}
          {tab === "flow" && (
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
          )}
          {tab === "tsmc" && (
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
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
