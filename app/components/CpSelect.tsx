"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Desplegable propio (estándar CINEPACK: nada de <select> nativo en toolbars/
// formularios — el único que queda a propósito es la celda de tipo "estado"
// dentro de la grilla de Vista Tabla, ahí sí es correcto por ser una planilla
// tipo Excel). Radius 0, Poppins, acento del departamento activo (var(--acc)).
// Reusa las clases cdp-sel-* ya definidas en dashboard.css.
//
// El menú de opciones se renderiza en un portal (no como hijo normal del
// botón): si este select vive dentro de un contenedor con overflow:auto más
// chico que la lista de opciones (ej. el popover de un ToolMenu), quedaba
// recortado en vez de flotar libremente por encima.
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
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const cerrar = () => setOpen(false);
    document.addEventListener("mousedown", h);
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("mousedown", h);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [open]);

  function abrir() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen((o) => !o);
  }

  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const actual = opts.find((o) => o.value === value)?.label ?? "";
  const host = typeof document !== "undefined" ? (document.querySelector(".cp-dash") ?? document.body) : null;

  return (
    <div className="cdp-sel" ref={wrapRef}>
      <button type="button" ref={btnRef} className="cdp-sel-btn" onClick={abrir}>
        <span className={actual ? "" : "cdp-sel-ph"}>{actual || placeholder}</span>
        <span className="cdp-sel-caret">▾</span>
      </button>
      {open && rect && host && createPortal(
        <div className="cdp-sel-menu cdp-sel-menu-portal" ref={menuRef} style={{ top: rect.top, left: rect.left, width: Math.max(rect.width, 180) }}>
          <button type="button" className="cdp-sel-opt" onClick={() => { onChange(""); setOpen(false); }}>{placeholder}</button>
          {opts.map((o) => (
            <button type="button" key={o.value} className={`cdp-sel-opt ${o.value === value ? "on" : ""}`} onClick={() => { onChange(o.value); setOpen(false); }}>{o.label}</button>
          ))}
        </div>,
        host
      )}
    </div>
  );
}
