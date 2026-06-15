"use client";

import { useState } from "react";
import HoyPanel from "./HoyPanel";
import GeneralesPanel from "./GeneralesPanel";
import HerramientasPanel from "./HerramientasPanel";
import EquipoMini from "./EquipoMini";
import "./dashboard.css";

type Tab = "hoy" | "generales" | "departamento" | "exclusivas";

export default function DepartmentDashboard({
  nombre,
  accent,
  fullName,
  cargo,
}: {
  nombre: string;
  accent: string;
  fullName: string;
  cargo?: string | null;
}) {
  const [tab, setTab] = useState<Tab>("hoy");
  const accVar = `var(--${accent})`;

  return (
    <div className="view active" style={{ "--acc": accVar } as React.CSSProperties}>
      <div className="dhead">
        <div className="dhead-top">
          <span className="hex"></span>
          <div>
            <span className="proj">Marea Oscura · Panel de departamento</span>
            <h2>{nombre}</h2>
            <span className="role-line">Cargo: <b>{cargo ?? "Sin asignar"}</b> - {fullName}</span>
          </div>
          <div className="who">
            <EquipoMini departamento={nombre} />
          </div>
        </div>
      </div>

      <div className="wtabs">
        <button className={`wtab ${tab === "hoy" ? "active" : ""}`} onClick={() => setTab("hoy")}>
          Hoy
        </button>
        <button className={`wtab ${tab === "generales" ? "active" : ""}`} onClick={() => setTab("generales")}>
          Generales
        </button>
        <button className={`wtab ${tab === "departamento" ? "active" : ""}`} onClick={() => setTab("departamento")}>
          Departamento
        </button>
        <button className={`wtab ${tab === "exclusivas" ? "active" : ""}`} onClick={() => setTab("exclusivas")}>
          Exclusivas
        </button>
      </div>

      {tab === "hoy" && (
        <div className="tpanel active">
          <HoyPanel deDepartamento={nombre} fullName={fullName} />
          <div className="note">
            <b>Hoy</b> es tu jornada: lo que el equipo espera de ti y las alertas que te afectan. Las{" "}
            <b>Generales</b> son las herramientas compartidas por todo el proyecto; en{" "}
            <b>Departamento</b> y <b>Exclusivas</b> tenés las tuyas según tu cargo.
          </div>
        </div>
      )}

      {tab === "generales" && (
        <div className="tpanel active">
          <GeneralesPanel departamento={nombre} fullName={fullName} />
        </div>
      )}

      {tab === "departamento" && (
        <div className="tpanel active">
          <HerramientasPanel departamento={nombre} cargo={cargo} fullName={fullName} seccion="departamento" />
        </div>
      )}

      {tab === "exclusivas" && (
        <div className="tpanel active">
          <HerramientasPanel departamento={nombre} cargo={cargo} fullName={fullName} seccion="cargo" />
        </div>
      )}
    </div>
  );
}
