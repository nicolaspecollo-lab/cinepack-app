"use client";

import { useState } from "react";

type Item = { label: string; value: number; color?: string; hint?: string };

export default function BarChart({ data, color = "var(--cyan)" }: { data: Item[]; color?: string }) {
  const [activo, setActivo] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="cp-chart-bars">
      {data.map((d, i) => (
        <div
          className="cp-chart-bar-row"
          key={d.label}
          style={{ position: "relative" }}
          onMouseEnter={() => setActivo(i)}
          onMouseLeave={() => setActivo(null)}
          onClick={() => setActivo(activo === i ? null : i)}
        >
          <span className="cp-chart-bar-label">{d.label}</span>
          <div className="cp-chart-bar-track">
            <div
              className="cp-chart-bar-fill"
              style={{ width: `${Math.round((d.value / max) * 100)}%`, background: d.color ?? color }}
            />
          </div>
          <span className="cp-chart-bar-value">{d.value}</span>
          {activo === i && d.hint && (
            <div
              style={{
                position: "absolute", left: "50%", bottom: "100%", transform: "translateX(-50%)",
                background: "var(--panel)", border: "1px solid var(--line)", padding: "6px 9px",
                fontSize: "11px", whiteSpace: "nowrap", zIndex: 5, marginBottom: "4px",
              }}
            >
              {d.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
