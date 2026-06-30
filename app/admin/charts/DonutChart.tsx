"use client";

import { useTranslations } from "next-intl";

type Slice = { label: string; value: number; color: string };

const R = 60;
const CIRC = 2 * Math.PI * R;

export default function DonutChart({ data }: { data: Slice[] }) {
  const t = useTranslations("charts");
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let acc = 0;
  const arcs = data.map((d) => {
    const frac = d.value / total;
    const dash = frac * CIRC;
    const offset = acc * CIRC;
    acc += frac;
    return { ...d, dash, offset, pct: Math.round(frac * 100) };
  });

  return (
    <div className="cp-chart-donut-wrap">
      <svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label={t("pieChartAria")}>
        <circle cx="80" cy="80" r={R} fill="none" stroke="var(--line)" strokeWidth="20" />
        {arcs.map((a) => (
          <circle
            key={a.label}
            cx="80" cy="80" r={R} fill="none"
            stroke={a.color} strokeWidth="20"
            strokeDasharray={`${a.dash} ${CIRC - a.dash}`}
            strokeDashoffset={-a.offset}
            transform="rotate(-90 80 80)"
          />
        ))}
        <text x="80" y="84" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--text)">{total}</text>
      </svg>
      <div className="cp-chart-legend">
        {arcs.map((a) => (
          <div className="cp-chart-legend-row" key={a.label}>
            <span className="dot" style={{ background: a.color }}></span>
            <span className="lbl">{a.label}</span>
            <span className="pct">{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
