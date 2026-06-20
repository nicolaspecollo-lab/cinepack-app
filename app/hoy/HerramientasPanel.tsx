"use client";

import { useEffect, useState } from "react";
import { deptTools, cargoGroups, type Herramienta } from "../herramientas";
import HerramientaPanel from "./HerramientaPanel";
import CandidatosPorPersonajePanel from "./CandidatosPorPersonajePanel";
import { createClient } from "@/lib/supabase/client";

type PersonalTool = {
  id: string;
  titulo: string;
  tipo: "tabla" | "nota";
  created_at: string;
};

function personalToHerramienta(pt: PersonalTool): Herramienta {
  return {
    id: pt.id,
    nombre: pt.titulo,
    tipo: pt.tipo,
    columnas: pt.tipo === "tabla" ? [] : undefined,
  };
}

const TIPO_TAG: Record<Herramienta["tipo"], string> = {
  tabla: "Tabla",
  nota: "Nota",
  checklist: "Checklist",
  ficha: "Ficha",
  galeria: "Galería",
  accesos: "Accesos",
};

const openKey = (dept: string) => `cinepack-open-tool-${dept}`;

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
  const [personalTools, setPersonalTools] = useState<PersonalTool[]>([]);
  const [abiertaPersonal, setAbiertaPersonal] = useState<PersonalTool | null>(null);

  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) return;
      const supabase = createClient();

      // Conteos de filas para herramientas estáticas
      const allTools = [
        ...deptTools(departamento),
        ...cargoGroups(departamento).flatMap((g) => g.tools),
      ];
      const ids = allTools.map((h) => h.id);
      if (ids.length > 0) {
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
      }

      // Herramientas personales del usuario (solo en Exclusivas)
      if (seccion === "cargo") {
        const { data: pts } = await supabase
          .from("personal_tools")
          .select("id, titulo, tipo, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        setPersonalTools((pts ?? []) as PersonalTool[]);
      }
    })();
  }, [departamento, seccion]);

  function abrir(h: Herramienta) {
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

  // Personal tool abierta
  if (abiertaPersonal) {
    const h = personalToHerramienta(abiertaPersonal);
    return (
      <div className="hp-open">
        <div className="hp-open-head">
          <button className="btn" onClick={() => setAbiertaPersonal(null)}>← Volver</button>
          <h3><span className="hex"></span> {abiertaPersonal.titulo}</h3>
          <span className="hp-open-tag">{TIPO_TAG[h.tipo]}</span>
          <button
            className="btn hp-btn-danger"
            style={{ marginLeft: "auto" }}
            onClick={async () => {
              if (!confirm("¿Eliminar esta herramienta personal y todos sus datos?")) return;
              const supabase = createClient();
              await supabase.from("personal_tools").delete().eq("id", abiertaPersonal.id);
              setPersonalTools((prev) => prev.filter((p) => p.id !== abiertaPersonal.id));
              setAbiertaPersonal(null);
            }}
          >
            🗑 Eliminar
          </button>
        </div>
        <HerramientaPanel departamento={departamento} herramienta={h} fullName={fullName} editable />
      </div>
    );
  }

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
              <ToolCard key={h.id} h={h} onClick={() => abrir(h)} conteo={conteos[h.id]} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  // seccion === "cargo": agrupadas por cargo, todas las del departamento.
  const groups = cargoGroups(departamento).filter((g) => g.tools.length > 0);
  if (groups.length === 0 && personalTools.length === 0) {
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
      {personalTools.length > 0 && (
        <section className="hp-group hp-group-personal">
          <span className="hp-group-label">
            <span className="hex" style={{ width: "8px", height: "7px" }} />
            Mis herramientas
            <span className="hp-mine">personales</span>
          </span>
          <div className="hp-cards">
            {personalTools.map((pt) => (
              <button key={pt.id} className="hcard hcard-personal" onClick={() => setAbiertaPersonal(pt)}>
                <div className="hcard-accent" />
                <div className="hcard-title">{pt.titulo}</div>
                <div className="hcard-meta">
                  <span className="hcard-badge">{pt.tipo === "tabla" ? "Cuadro de celdas" : "Nota"}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
      {groups.map((g) => {
        const esMio = !!cargo && g.cargo === cargo;
        return (
          <section className="hp-group" key={g.cargo}>
            <span className="hp-group-label">
              <span className="hex" style={{ width: "8px", height: "7px" }} />
              {g.cargo}
              {esMio && <span className="hp-mine">tu cargo</span>}
            </span>
            <div className="hp-cards">
              {g.tools.map((h) => (
                <ToolCard key={`${g.cargo}-${h.id}`} h={h} onClick={() => abrir(h)} cargo conteo={conteos[h.id]} />
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
  conteo,
}: {
  h: Herramienta;
  onClick: () => void;
  cargo?: boolean;
  conteo?: number;
}) {
  const unidad = h.tipo === "checklist" ? "items" : h.tipo === "galeria" ? "fotos" : "filas";
  return (
    <button className="hcard" onClick={onClick}>
      <div className="hcard-accent" />
      <div className="hcard-title">{h.nombre}</div>
      {h.hint && <div className="hcard-desc">{h.hint}</div>}
      <div className="hcard-meta">
        <span className="hcard-badge">{TIPO_TAG[h.tipo]}</span>
        {conteo != null && conteo > 0 && (
          <span className="hcard-count">{conteo} {unidad}</span>
        )}
        {(conteo == null || conteo === 0) && h.tipo === "tabla" && (
          <span className="hcard-badge">vacía</span>
        )}
      </div>
    </button>
  );
}
