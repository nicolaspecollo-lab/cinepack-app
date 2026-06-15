"use client";

import { useState } from "react";
import { deptTools, cargoGroups, type Herramienta } from "../herramientas";
import HerramientaPanel from "./HerramientaPanel";

const TIPO_TAG: Record<Herramienta["tipo"], string> = {
  tabla: "Tabla",
  nota: "Nota",
  checklist: "Checklist",
  ficha: "Ficha",
  galeria: "Galería",
  accesos: "Accesos",
};

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

  if (abierta) {
    return (
      <div className="hp-open">
        <div className="hp-open-head">
          <button className="btn" onClick={() => setAbierta(null)}>← Volver</button>
          <h3><span className="hex"></span> {abierta.nombre}</h3>
          <span className="hp-open-tag">{TIPO_TAG[abierta.tipo]}</span>
        </div>
        <HerramientaPanel departamento={departamento} herramienta={abierta} fullName={fullName} />
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
              <ToolCard key={h.id} h={h} onClick={() => setAbierta(h)} />
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
    <div className="hp-index">
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
                <ToolCard key={`${g.cargo}-${h.id}`} h={h} onClick={() => setAbierta(h)} cargo />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ToolCard({ h, onClick, cargo }: { h: Herramienta; onClick: () => void; cargo?: boolean }) {
  return (
    <button className={`hp-card ${cargo ? "rol" : ""}`} onClick={onClick}>
      <span className="hex"></span>
      <span className="hp-card-name">{h.nombre}</span>
      <span className="hp-card-tag">{TIPO_TAG[h.tipo]}</span>
      {h.hint && <span className="hp-card-hint">{h.hint}</span>}
    </button>
  );
}
