"use client";

import { useEffect, useRef, useState } from "react";

// Desplegable propio (estándar CINEPACK: nada de <select> nativo en toolbars/
// formularios — el único que queda a propósito es la celda de tipo "estado"
// dentro de la grilla de Vista Tabla, ahí sí es correcto por ser una planilla
// tipo Excel). Radius 0, Poppins, acento del departamento activo (var(--acc)).
// Reusa las clases cdp-sel-* ya definidas en dashboard.css.
export default function CpSelect({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: string[] | { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const actual = opts.find((o) => o.value === value)?.label ?? "";

  return (
    <div className="cdp-sel" ref={ref}>
      <button type="button" className="cdp-sel-btn" onClick={() => setOpen((o) => !o)}>
        <span className={actual ? "" : "cdp-sel-ph"}>{actual || placeholder}</span>
        <span className="cdp-sel-caret">▾</span>
      </button>
      {open && (
        <div className="cdp-sel-menu">
          <button type="button" className="cdp-sel-opt" onClick={() => { onChange(""); setOpen(false); }}>{placeholder}</button>
          {opts.map((o) => (
            <button type="button" key={o.value} className={`cdp-sel-opt ${o.value === value ? "on" : ""}`} onClick={() => { onChange(o.value); setOpen(false); }}>{o.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
