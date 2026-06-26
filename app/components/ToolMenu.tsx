"use client";

// Menú desplegable de toolbar reutilizable: un botón con chevron que abre un
// popover. Cierra al hacer clic fuera o con Escape. Se usa para agrupar las
// funciones secundarias de los toolbars (vista, exportar, filtrar, ordenar).

import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon";

export default function ToolMenu({
  label,
  icon,
  badge,
  children,
  align = "left",
  width,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Icon>["name"];
  badge?: number;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: "left" | "right";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="tm-wrap" ref={ref}>
      <button
        type="button"
        className={`btn tm-trigger${open ? " active" : ""}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {icon && <Icon name={icon} size={14} />}
        <span className="tm-label">{label}</span>
        {badge ? <span className="tm-badge">{badge}</span> : null}
        <Icon name="chevron-down" size={11} />
      </button>
      {open && (
        <div className={`tm-menu tm-menu-${align}`} id={id} style={width ? { width } : undefined}>
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}
