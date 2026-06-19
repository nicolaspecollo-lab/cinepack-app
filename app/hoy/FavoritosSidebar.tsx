"use client";

import { useEffect, useState } from "react";
import { deptTools, HERRAMIENTA_POR_ID } from "../herramientas";

const COLLAPSE_KEY = "cinepack-sidebar-collapsed";
const favKey = (dept: string) => `cinepack-fav-tools-${dept}`;
const recentKey = (dept: string) => `cinepack-recent-tools-${dept}`;
const openKey = (dept: string) => `cinepack-open-tool-${dept}`;

function leerIds(key: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default function FavoritosSidebar({
  departamento,
  onAbrirTab,
}: {
  departamento: string;
  onAbrirTab: (seccion: "departamento" | "exclusivas") => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [recientes, setRecientes] = useState<string[]>([]);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    refrescar();
    function onStorage() {
      refrescar();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("cp-tools-changed", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cp-tools-changed", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departamento]);

  function refrescar() {
    setFavoritos(leerIds(favKey(departamento)));
    setRecientes(leerIds(recentKey(departamento)));
  }

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
  }

  function quitarFavorito(id: string) {
    const next = favoritos.filter((f) => f !== id);
    setFavoritos(next);
    localStorage.setItem(favKey(departamento), JSON.stringify(next));
  }

  function abrir(id: string) {
    const h = HERRAMIENTA_POR_ID[id];
    if (!h) return;
    const enDepto = deptTools(departamento).some((t) => t.id === id);
    const seccion: "departamento" | "exclusivas" = enDepto ? "departamento" : "exclusivas";
    localStorage.setItem(openKey(departamento), id);
    onAbrirTab(seccion);
  }

  const favs = favoritos.map((id) => HERRAMIENTA_POR_ID[id]).filter(Boolean);
  const recents = recientes.map((id) => HERRAMIENTA_POR_ID[id]).filter(Boolean);

  if (favs.length === 0 && recents.length === 0 && collapsed) {
    return null;
  }

  return (
    <div className={`cp-sidebar ${collapsed ? "collapsed" : ""}`}>
      <button className="cp-sidebar-toggle" onClick={toggleCollapsed} title={collapsed ? "Mostrar accesos rápidos" : "Ocultar"}>
        {collapsed ? "☆" : "✕"}
      </button>
      {!collapsed && (
        <div className="cp-sidebar-body">
          {favs.length > 0 && (
            <div className="cp-sidebar-section">
              <span className="cp-sidebar-label">Favoritos</span>
              <ul>
                {favs.map((h) => (
                  <li key={h.id}>
                    <button className="cp-sidebar-item" onClick={() => abrir(h.id)}>{h.nombre}</button>
                    <button className="cp-sidebar-star active" onClick={() => quitarFavorito(h.id)} title="Quitar de favoritos">★</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recents.length > 0 && (
            <div className="cp-sidebar-section">
              <span className="cp-sidebar-label">Recientes</span>
              <ul>
                {recents.map((h) => (
                  <li key={h.id}>
                    <button className="cp-sidebar-item" onClick={() => abrir(h.id)}>{h.nombre}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
