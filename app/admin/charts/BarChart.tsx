"use client";

type Item = { label: string; value: number };

export default function BarChart({ data, color = "var(--cyan)" }: { data: Item[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="cp-chart-bars">
      {data.map((d) => (
        <div className="cp-chart-bar-row" key={d.label}>
          <span className="cp-chart-bar-label">{d.label}</span>
          <div className="cp-chart-bar-track">
            <div
              className="cp-chart-bar-fill"
              style={{ width: `${Math.round((d.value / max) * 100)}%`, background: color }}
            />
          </div>
          <span className="cp-chart-bar-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
