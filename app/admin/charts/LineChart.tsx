"use client";

import { useState } from "react";

type Point = { label: string; value: number; usuarios?: number };

const W = 600;
const H = 200;
const PAD = 28;

export default function LineChart({ data, color = "var(--lime)" }: { data: Point[]; color?: string }) {
  const [activo, setActivo] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = PAD + i * stepX;
    const y = H - PAD - (d.value / max) * (H - PAD * 2);
    return { x, y, ...d };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${path} L${points[points.length - 1]?.x ?? PAD},${H - PAD} L${PAD},${H - PAD} Z`;
  const punto = activo !== null ? points[activo] : null;

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label="Gráfico de línea"
        preserveAspectRatio="none"
        onMouseLeave={() => setActivo(null)}
      >
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--line)" strokeWidth="1" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--line)" strokeWidth="1" />
        {points.length > 0 && <path d={area} fill={color} opacity="0.08" />}
        {points.length > 0 && <path d={path} fill="none" stroke={color} strokeWidth="2" />}
        {punto && (
          <line x1={punto.x} y1={PAD} x2={punto.x} y2={H - PAD} stroke={color} strokeWidth="1" opacity="0.3" />
        )}
        {points.map((p, i) => (
          <circle
            key={p.label}
            cx={p.x}
            cy={p.y}
            r={activo === i ? 5 : 3}
            fill={color}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setActivo(i)}
            onClick={() => setActivo(activo === i ? null : i)}
          />
        ))}
        {/* objetivos de toque más grandes e invisibles, para que el tap en mobile no falle por el radio chico del punto */}
        {points.map((p, i) => (
          <rect
            key={`hit-${p.label}`}
            x={p.x - stepX / 2}
            y={PAD}
            width={Math.max(stepX, 16)}
            height={H - PAD * 2}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setActivo(i)}
            onClick={() => setActivo(activo === i ? null : i)}
          />
        ))}
        {points.map((p, i) => (
          (i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0) && (
            <text key={`lbl-${p.label}`} x={p.x} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--muted)">
              {p.label}
            </text>
          )
        ))}
      </svg>
      {punto && (
        <div
          style={{
            position: "absolute",
            left: `${(punto.x / W) * 100}%`,
            top: `${(punto.y / H) * 100}%`,
            transform: "translate(-50%, -130%)",
            background: "var(--panel)",
            border: "1px solid var(--line)",
            padding: "8px 10px",
            fontSize: "11px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <div style={{ fontWeight: 700 }}>{punto.label}</div>
          <div>{punto.value} acciones</div>
          {punto.usuarios !== undefined && <div>{punto.usuarios} usuario{punto.usuarios === 1 ? "" : "s"} activo{punto.usuarios === 1 ? "" : "s"}</div>}
        </div>
      )}
    </div>
  );
}
