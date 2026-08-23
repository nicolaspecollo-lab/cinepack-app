"use client";

// Menú desplegable de toolbar reutilizable: un botón con chevron que abre un
// popover. Cierra al hacer clic fuera o con Escape. Se usa para agrupar las
// funciones secundarias de los toolbars (vista, exportar, filtrar, ordenar).
//
// El popover se monta en un portal al contenedor .cp-dash más cercano (no a
// document.body: así sigue heredando las variables CSS del tema — --acc,
// --bg-2, etc. — y la clase cp-light si aplica), posicionado en `fixed` con
// las coordenadas reales del botón. El toolbar de TablaTool tiene
// overflow-x:auto (para scrollear en vez de partirse en 2 líneas en pantallas
// angostas), y por espec de CSS eso fuerza overflow-y a un valor no-visible
// también — cualquier menú `absolute` dentro de ese toolbar quedaba recortado
// verticalmente. `position:fixed` escapa de esa cadena de overflow (no la de
// un ancestro con transform, pero acá no hay ninguno).

import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
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
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const [portalEl, setPortalEl] = useState<Element | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();

  function place() {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (align === "right") {
      setPos({ top: r.bottom + 5, right: Math.max(8, window.innerWidth - r.right) });
    } else {
      setPos({ top: r.bottom + 5, left: Math.max(8, r.left) });
    }
  }

  useLayoutEffect(() => {
    if (!open) return;
    setPortalEl(wrapRef.current?.closest(".cp-dash") ?? document.body);
    place();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    function onReflow() { place(); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="tm-wrap" ref={wrapRef}>
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
      {open && pos && portalEl && createPortal(
        <div
          className="tm-menu"
          id={id}
          ref={menuRef}
          style={{ top: pos.top, left: pos.left, right: pos.right, width }}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>,
        portalEl
      )}
    </div>
  );
}
