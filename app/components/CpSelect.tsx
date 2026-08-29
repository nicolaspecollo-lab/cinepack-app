"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  permitirLibre,
}: {
  value: string;
  options: string[] | { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder: string;
  // Además de las opciones fijas, deja escribir un valor propio ("Otro...")
  // — para listas orientativas (ej. "Departamento") que no pueden cubrir
  // todos los casos reales de un proyecto.
  permitirLibre?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; abreArriba: boolean } | null>(null);
  const [escribiendo, setEscribiendo] = useState(false);
  const [libreVal, setLibreVal] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const libreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    // "scroll" en window con capture:true también recibe el scroll INTERNO
    // del propio menú (el evento no burbujea a window, pero sí se ve en la
    // fase de captura al pasar por él) — sin este chequeo, scrollear la
    // lista de opciones cerraba el menú al instante, dando la sensación de
    // una "imagen fija" que no reacciona al scroll. Solo cierra si el
    // scroll pasó por fuera del menú (ej. la tabla de fondo, o la página).
    const cerrar = (e: Event) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("mousedown", h);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [open]);

  // Si la fila está cerca del fondo de la pantalla, el menú (hasta 280px de
  // alto) se salía por debajo del viewport — quedaba con las últimas
  // opciones inalcanzables, sin forma de "bajar" a verlas (era el propio
  // menú el que estaba cortado, no algo que un scroll de página arreglara).
  // Se mide la altura real ya renderizada y, si no entra hacia abajo, se abre
  // hacia arriba en su lugar.
  useLayoutEffect(() => {
    if (!open || !menuRef.current || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const alto = menuRef.current.getBoundingClientRect().height;
    const cabeAbajo = r.bottom + 4 + alto <= window.innerHeight - 8;
    setRect((prev) => {
      const abreArriba = !cabeAbajo;
      const top = abreArriba ? Math.max(8, r.top - 4 - alto) : r.bottom + 4;
      if (prev && prev.top === top && prev.abreArriba === abreArriba) return prev;
      return { top, left: r.left, width: r.width, abreArriba };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, escribiendo]);

  useEffect(() => {
    if (escribiendo) libreInputRef.current?.focus();
  }, [escribiendo]);

  function abrir() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setRect({ top: r.bottom + 4, left: r.left, width: r.width, abreArriba: false });
    setEscribiendo(false);
    setLibreVal("");
    setOpen((o) => !o);
  }

  function confirmarLibre() {
    const v = libreVal.trim();
    if (v) onChange(v);
    setOpen(false);
  }

  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const actual = opts.find((o) => o.value === value)?.label ?? value;
  const host = typeof document !== "undefined" ? (document.querySelector(".cp-dash") ?? document.body) : null;
  // El menú se porta a .cp-dash, fuera del árbol del trigger — si el trigger
  // vive dentro de una sección migrada a Opción C (.cp-optc), el portal no
  // hereda esa clase solo. Se detecta acá y se suma a mano al portal.
  const enOpcionC = !!wrapRef.current?.closest(".cp-optc");

  return (
    <div className="cdp-sel" ref={wrapRef}>
      <button type="button" ref={btnRef} className="cdp-sel-btn" onClick={abrir}>
        <span className={actual ? "" : "cdp-sel-ph"}>{actual || placeholder}</span>
        <span className="cdp-sel-caret">▾</span>
      </button>
      {open && rect && host && createPortal(
        <div
          className={`cdp-sel-menu cdp-sel-menu-portal ${enOpcionC ? "cp-optc" : ""}`}
          ref={menuRef}
          style={{ top: rect.top, left: rect.left, width: Math.max(rect.width, 180) }}
        >
          <button type="button" className="cdp-sel-opt" onClick={() => { onChange(""); setOpen(false); }}>{placeholder}</button>
          {opts.map((o) => (
            <button type="button" key={o.value} className={`cdp-sel-opt ${o.value === value ? "on" : ""}`} onClick={() => { onChange(o.value); setOpen(false); }}>{o.label}</button>
          ))}
          {permitirLibre && (
            escribiendo ? (
              <div className="cdp-sel-libre">
                <input
                  ref={libreInputRef}
                  className="cdp-sel-libre-input"
                  value={libreVal}
                  onChange={(e) => setLibreVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmarLibre();
                    if (e.key === "Escape") setOpen(false);
                  }}
                  placeholder="Escribí un valor…"
                />
                <button type="button" className="cdp-sel-libre-ok" onClick={confirmarLibre}>OK</button>
              </div>
            ) : (
              <button type="button" className="cdp-sel-opt cdp-sel-opt-otro" onClick={() => setEscribiendo(true)}>
                Otro…
              </button>
            )
          )}
        </div>,
        host
      )}
    </div>
  );
}
