"use client";

import { useState } from "react";
import ConsultasPanel from "./ConsultasPanel";
import ComunicadosPanel from "./ComunicadosPanel";
import GuionPanel from "./GuionPanel";
import GuionTecnicoPanel from "./GuionTecnicoPanel";
import NotificacionesPanel from "./NotificacionesPanel";
import EscenasPanel from "./EscenasPanel";
import EspacioTrabajoPanel from "./EspacioTrabajoPanel";
import VisionadoPanel from "./VisionadoPanel";
import EquipoPanel from "./EquipoPanel";
import AccesosPanel from "./AccesosPanel";
import PipelinePanel from "./PipelinePanel";
import HerramientaPanel from "./HerramientaPanel";
import { GENERAL_CALENDARIO, GENERAL_PLAN_RODAJE, GENERAL_ORDEN_RODAJE } from "../herramientas";

// Las Herramientas Generales del mapa de trabajo, contenidas en una sola pestaña
// que despliega sub-pestañas. Iguales para todo el proyecto.
type Sub =
  | "comunicados" | "consultas" | "notificaciones" | "guion" | "guiontec"
  | "calendario" | "plan" | "orden" | "escena3d"
  | "espacio" | "visionado" | "equipo" | "accesos" | "pipeline";

type SubDef = { id: Sub; label: string; cond?: (d: string) => boolean };

const SUBS: SubDef[] = [
  { id: "comunicados", label: "Comunicados" },
  { id: "notificaciones", label: "Notificaciones", cond: (d) => d === "Ejecutivo" },
  { id: "consultas", label: "Consultas" },
  { id: "calendario", label: "Calendario general" },
  { id: "guion", label: "Guion" },
  { id: "guiontec", label: "Guion Técnico" },
  { id: "plan", label: "Plan de rodaje" },
  { id: "orden", label: "Orden de rodaje" },
  { id: "escena3d", label: "Escena 3D" },
  { id: "espacio", label: "Espacio de trabajo" },
  { id: "visionado", label: "Visionado" },
  { id: "equipo", label: "Equipo" },
  { id: "accesos", label: "Accesos" },
  { id: "pipeline", label: "Pipeline", cond: (d) => d === "Ejecutivo" || d === "Producción" },
];

export default function GeneralesPanel({
  departamento,
  fullName,
}: {
  departamento: string;
  fullName: string;
}) {
  const subs = SUBS.filter((s) => !s.cond || s.cond(departamento));
  const [sub, setSub] = useState<Sub>("comunicados");

  return (
    <div className="gen">
      <div className="dsubtabs">
        {subs.map((s) => (
          <button
            key={s.id}
            className={`dsubtab ${sub === s.id ? "active" : ""}`}
            onClick={() => setSub(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="gen-body">
        {sub === "comunicados" && <ComunicadosPanel deDepartamento={departamento} fullName={fullName} />}
        {sub === "notificaciones" && <NotificacionesPanel />}
        {sub === "consultas" && <ConsultasPanel deDepartamento={departamento} fullName={fullName} />}
        {sub === "guion" && <GuionPanel fullName={fullName} />}
        {sub === "guiontec" && <GuionTecnicoPanel />}
        {sub === "escena3d" && <EscenasPanel departamento={departamento} />}
        {sub === "espacio" && <EspacioTrabajoPanel departamento={departamento} fullName={fullName} />}
        {sub === "visionado" && <VisionadoPanel departamento={departamento} fullName={fullName} />}
        {sub === "equipo" && <EquipoPanel departamento={departamento} />}
        {sub === "accesos" && <AccesosPanel deDepartamento={departamento} fullName={fullName} />}
        {sub === "pipeline" && <PipelinePanel fullName={fullName} />}

        {sub === "calendario" && (
          <div className="hp-open">
            <div className="hp-open-head"><h3><span className="hex"></span> Calendario general del proyecto</h3></div>
            <HerramientaPanel departamento="General" herramienta={GENERAL_CALENDARIO} fullName={fullName} />
          </div>
        )}
        {sub === "plan" && (
          <div className="hp-open">
            <div className="hp-open-head"><h3><span className="hex"></span> Plan de rodaje</h3></div>
            <HerramientaPanel departamento="General" herramienta={GENERAL_PLAN_RODAJE} fullName={fullName} />
          </div>
        )}
        {sub === "orden" && (
          <div className="hp-open">
            <div className="hp-open-head"><h3><span className="hex"></span> Orden de rodaje (callsheet)</h3></div>
            <HerramientaPanel departamento="General" herramienta={GENERAL_ORDEN_RODAJE} fullName={fullName} />
          </div>
        )}
      </div>
    </div>
  );
}
