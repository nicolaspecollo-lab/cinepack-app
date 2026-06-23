"use client";

type Point = { label: string; value: number };

const W = 600;
const H = 200;
const PAD = 28;

export default function LineChart({ data, color = "var(--lime)" }: { data: Point[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = PAD + i * stepX;
    const y = H - PAD - (d.value / max) * (H - PAD * 2);
    return { x, y, ...d };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${path} L${points[points.length - 1]?.x ?? PAD},${H - PAD} L${PAD},${H - PAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Gráfico de línea" preserveAspectRatio="none">
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--line)" strokeWidth="1" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--line)" strokeWidth="1" />
      {points.length > 0 && <path d={area} fill={color} opacity="0.08" />}
      {points.length > 0 && <path d={path} fill="none" stroke={color} strokeWidth="2" />}
      {points.map((p) => (
        <circle key={p.label} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
      {points.map((p, i) => (
        (i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0) && (
          <text key={`lbl-${p.label}`} x={p.x} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--muted)">
            {p.label}
          </text>
        )
      ))}
    </svg>
  );
}
