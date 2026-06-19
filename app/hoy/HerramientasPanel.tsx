"use client";

import { useEffect, useState } from "react";
import { deptTools, cargoGroups, type Herramienta } from "../herramientas";
import HerramientaPanel from "./HerramientaPanel";
import CandidatosPorPersonajePanel from "./CandidatosPorPersonajePanel";
import { createClient } from "@/lib/supabase/client";

const TIPO_TAG: Record<Herramienta["tipo"], string> = {
  tabla: "Tabla",
  nota: "Nota",
  checklist: "Checklist",
  ficha: "Ficha",
  galeria: "Galería",
  accesos: "Accesos",
};

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

function esFavorito(dept: string, id: string): boolean {
  return leerIds(favKey(dept)).includes(id);
}

function toggleFavorito(dept: string, id: string) {
  const actuales = leerIds(favKey(dept));
  const next = actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id];
  localStorage.setItem(favKey(dept), JSON.stringify(next));
  window.dispatchEvent(new Event("cp-tools-changed"));
}

function registrarReciente(dept: string, id: string) {
  const actuales = leerIds(recentKey(dept)).filter((x) => x !== id);
  const next = [id, ...actuales].slice(0, 5);
  localStorage.setItem(recentKey(dept), JSON.stringify(next));
  window.dispatchEvent(new Event("cp-tools-changed"));
}

export default function HerramientasPanel({
  departamento,
  cargo,
  fullName,
  seccion,
}: {
  departamento: string;
  cargo?: string | null;
  fullName: string;
  seccion: "departamento" | "cargo";
}) {
  const [abierta, setAbierta] = useState<Herramienta | null>(null);
  const [vista, setVista] = useState<"tabla" | "personajes">("tabla");
  const [conteos, setConteos] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) return;
      const allTools = [
        ...deptTools(departamento),
        ...cargoGroups(departamento).flatMap((g) => g.tools),
      ];
      const ids = allTools.map((h) => h.id);
      if (ids.length === 0) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("herramienta_filas")
        .select("herramienta_id")
        .eq("project_id", projectId)
        .in("herramienta_id", ids);
      if (data) {
        const c: Record<string, number> = {};
        for (const r of data) c[r.herramienta_id] = (c[r.herramienta_id] ?? 0) + 1;
        setConteos(c);
      }
    })();
  }, [departamento]);

  function abrir(h: Herramienta) {
    registrarReciente(departamento, h.id);
    setAbierta(h);
  }

  useEffect(() => {
    const id = localStorage.getItem(openKey(departamento));
    if (!id) return;
    const candidatos =
      seccion === "departamento"
        ? deptTools(departamento)
        : cargoGroups(departamento).flatMap((g) => g.tools);
    const h = candidatos.find((t) => t.id === id);
    if (h) {
      localStorage.removeItem(openKey(departamento));
      abrir(h);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departamento, seccion]);

  if (abierta) {
    const esCasting = abierta.id === "cast-candidatos";
    return (
      <div className="hp-open">
        <div className="hp-open-head">
          <button className="btn" onClick={() => { setAbierta(null); setVista("tabla"); }}>← Volver</button>
          <h3><span className="hex"></span> {abierta.nombre}</h3>
          <span className="hp-open-tag">{TIPO_TAG[abierta.tipo]}</span>
        </div>
        {esCasting && (
          <div className="dsubtabs">
            <button className={`dsubtab ${vista === "tabla" ? "active" : ""}`} onClick={() => setVista("tabla")}>
              Tabla
            </button>
            <button className={`dsubtab ${vista === "personajes" ? "active" : ""}`} onClick={() => setVista("personajes")}>
              Por personaje
            </button>
          </div>
        )}
        {esCasting && vista === "personajes" ? (
          <CandidatosPorPersonajePanel departamento={departamento} />
        ) : (
          <HerramientaPanel departamento={departamento} herramienta={abierta} fullName={fullName} />
        )}
      </div>
    );
  }

  if (seccion === "departamento") {
    const tools = deptTools(departamento);
    if (tools.length === 0) {
      return (
        <div className="soon-box">
          <span className="hex"></span>
          <h4>Sin herramientas de departamento</h4>
          <p>Este departamento todavía no tiene herramientas compartidas en el mapa de trabajo.</p>
        </div>
      );
    }
    return (
      <div className="hp-index">
        <section className="hp-group">
          <span className="hp-group-label">Herramientas de {departamento}</span>
          <div className="hp-cards">
            {tools.map((h) => (
              <ToolCard key={h.id} h={h} departamento={departamento} onClick={() => abrir(h)} conteo={conteos[h.id]} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  // seccion === "cargo": agrupadas por cargo, todas las del departamento.
  const groups = cargoGroups(departamento).filter((g) => g.tools.length > 0);
  if (groups.length === 0) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Sin herramientas exclusivas</h4>
        <p>Este departamento todavía no tiene herramientas exclusivas de cargo en el mapa.</p>
      </div>
    );
  }

  return (
    <div className="hp-index hp-index-cols">
      {groups.map((g) => {
        const esMio = !!cargo && g.cargo === cargo;
        return (
          <section className="hp-group" key={g.cargo}>
            <span className="hp-group-label">
              {g.cargo}
              {esMio && <span className="hp-mine">tu cargo</span>}
            </span>
            <div className="hp-cards">
              {g.tools.map((h) => (
                <ToolCard key={`${g.cargo}-${h.id}`} h={h} departamento={departamento} onClick={() => abrir(h)} cargo conteo={conteos[h.id]} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ToolCard({
  h,
  onClick,
  cargo,
  departamento,
  conteo,
}: {
  h: Herramienta;
  onClick: () => void;
  cargo?: boolean;
  departamento: string;
  conteo?: number;
}) {
  const [fav, setFav] = useState(false);

  useEffect(() => {
    setFav(esFavorito(departamento, h.id));
  }, [departamento, h.id]);

  return (
    <div className={`hp-card ${cargo ? "rol" : ""}`}>
      <button
        className={`hp-card-fav ${fav ? "active" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorito(departamento, h.id);
          setFav((v) => !v);
        }}
        title={fav ? "Quitar de favoritos" : "Marcar como favorito"}
      >
        ★
      </button>
      <button className="hp-card-main" onClick={onClick}>
        <span className="hex"></span>
        <span className="hp-card-name">{h.nombre}</span>
        <div className="hp-card-row">
          <span className="hp-card-tag">{TIPO_TAG[h.tipo]}</span>
          {conteo != null && conteo > 0 && (
            <span className="hp-card-count">{conteo} {h.tipo === "checklist" ? "items" : h.tipo === "galeria" ? "fotos" : "filas"}</span>
          )}
          {(conteo == null || conteo === 0) && h.tipo === "tabla" && (
            <span className="hp-card-count hp-card-count-empty">vacía</span>
          )}
        </div>
        {h.hint && <span className="hp-card-hint">{h.hint}</span>}
      </button>
    </div>
  );
}
