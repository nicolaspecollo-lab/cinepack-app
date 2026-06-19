"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PaletteItem = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  onSelect: () => void;
};

export default function CommandPalette({
  items,
  onCrearTarea,
  onAskIA,
}: {
  items: PaletteItem[];
  onCrearTarea?: (texto: string) => void;
  onAskIA?: (texto: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 20);
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q) || (i.hint ?? "").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [items, query]);

  function choose(item: PaletteItem) {
    item.onSelect();
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIdx]) choose(filtered[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showDropdown = open && (filtered.length > 0 || query.trim().length > 1);

  return (
    <div className="cmdk-inline-wrap" ref={wrapRef}>
      <div className="cmdk-inline-field">
        <span className="hex cmdk-inline-hex"></span>
        <input
          ref={inputRef}
          className="cmdk-inline-input"
          placeholder="Buscar…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          autoComplete="off"
        />
      </div>
      {showDropdown && (
        <div className="cmdk-drop">
          <div className="cmdk-list">
            {filtered.length === 0 && <div className="cmdk-empty">Sin resultados.</div>}
            {filtered.map((item, idx) => (
              <button
                key={item.id}
                className={`cmdk-item ${idx === activeIdx ? "active" : ""}`}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseDown={(e) => { e.preventDefault(); choose(item); }}
              >
                <span className="cmdk-item-label">{item.label}</span>
                <span className="cmdk-item-group">{item.group}</span>
              </button>
            ))}
            {query.trim().length > 1 && onCrearTarea && (
              <button
                className="cmdk-item cmdk-item-action"
                onMouseDown={(e) => { e.preventDefault(); onCrearTarea(query.trim()); setOpen(false); setQuery(""); }}
              >
                <span className="cmdk-item-label">+ Crear tarea: &quot;{query.trim()}&quot;</span>
                <span className="cmdk-item-group">Acción</span>
              </button>
            )}
            {query.trim().length > 1 && onAskIA && (
              <button
                className="cmdk-item cmdk-item-action"
                onMouseDown={(e) => { e.preventDefault(); onAskIA(query.trim()); setOpen(false); setQuery(""); }}
              >
                <span className="cmdk-item-label">IA: &quot;{query.trim()}&quot;</span>
                <span className="cmdk-item-group">Asistente</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
