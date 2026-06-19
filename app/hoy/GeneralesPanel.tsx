"use client";

import { useEffect, useState } from "react";
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
import OrdenRodajePanel from "./OrdenRodajePanel";
import { GENERAL_CALENDARIO, GENERAL_PLAN_RODAJE, GENERAL_CONTACTOS_EMERGENCIA, GENERAL_CHECKLIST_WRAP } from "../herramientas";

// Las Herramientas Generales del mapa de trabajo, contenidas en una sola pestaña
// que despliega sub-pestañas. Iguales para todo el proyecto.
export type Sub =
  | "comunicados" | "consultas" | "notificaciones" | "guion" | "guiontec"
  | "calendario" | "plan" | "orden" | "escena3d"
  | "espacio" | "visionado" | "equipo" | "accesos" | "pipeline"
  | "contactos" | "wrap";

// Departamentos que pueden EDITAR cada herramienta general.
// Ejecutivo siempre puede editar (se suma en canEdit abajo).
// null = cualquiera puede editar (comunicados, consultas, espacio son personales/colaborativos).
// [] = nadie edita directamente desde aquí (Escena 3D es vista agregada).
const PROPIETARIOS: Partial<Record<Sub, string[] | null>> = {
  guion:      ["Guion"],
  guiontec:   ["Dirección", "Guion"],
  plan:       ["Producción"],
  orden:      ["Dirección", "Producción"],
  calendario: ["Producción"],
  visionado:  ["Dirección", "Arte", "Fotografía", "Postproducción"],
  equipo:     ["RRHH"],
  accesos:    [],           // solo Ejecutivo vía la lógica de abajo
  contactos:  ["Producción"],
  wrap:       ["Producción"],
  escena3d:   [],           // vista agregada, sin edición directa
};

function canEditSub(sub: Sub, departamento: string): boolean {
  const owners = PROPIETARIOS[sub];
  if (owners === undefined || owners === null) return true;   // cualquiera
  if (departamento === "Ejecutivo") return true;              // superusuario
  return owners.includes(departamento);
}

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
  { id: "contactos", label: "Contactos emergencia" },
  { id: "wrap", label: "Checklist wrap" },
];

export default function GeneralesPanel({
  departamento,
  fullName,
  jumpTo,
}: {
  departamento: string;
  fullName: string;
  jumpTo?: { sub: Sub; token: number } | null;
}) {
  const subs = SUBS.filter((s) => !s.cond || s.cond(departamento));
  const [sub, setSub] = useState<Sub>("comunicados");

  useEffect(() => {
    if (jumpTo) setSub(jumpTo.sub);
  }, [jumpTo]);

  const ce = (s: Sub) => canEditSub(s, departamento);

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
            {!ce(s.id) && <span className="dsubtab-eye" title="Solo visionado"> 👁</span>}
          </button>
        ))}
      </div>

      <div className="gen-body">
        {sub === "comunicados" && <ComunicadosPanel deDepartamento={departamento} fullName={fullName} />}
        {sub === "notificaciones" && <NotificacionesPanel />}
        {sub === "consultas" && <ConsultasPanel deDepartamento={departamento} fullName={fullName} />}
        {sub === "guion" && <GuionPanel fullName={fullName} canEdit={ce("guion")} />}
        {sub === "guiontec" && <GuionTecnicoPanel fullName={fullName} canEdit={ce("guiontec")} />}
        {sub === "escena3d" && <EscenasPanel departamento={departamento} />}
        {sub === "espacio" && <EspacioTrabajoPanel departamento={departamento} fullName={fullName} />}
        {sub === "visionado" && <VisionadoPanel departamento={departamento} fullName={fullName} />}
        {sub === "equipo" && <EquipoPanel departamento={departamento} />}
        {sub === "accesos" && <AccesosPanel deDepartamento={departamento} fullName={fullName} />}
        {sub === "pipeline" && <PipelinePanel fullName={fullName} />}

        {sub === "calendario" && (
          <div className="hp-open">
            {!ce("calendario") && <ReadOnlyBanner propietario="Producción" />}
            <div className="hp-open-head"><h3><span className="hex"></span> Calendario general del proyecto</h3></div>
            <HerramientaPanel departamento="General" herramienta={GENERAL_CALENDARIO} fullName={fullName} editable={ce("calendario")} />
          </div>
        )}
        {sub === "plan" && (
          <div className="hp-open">
            {!ce("plan") && <ReadOnlyBanner propietario="Producción" />}
            <div className="hp-open-head"><h3><span className="hex"></span> Plan de rodaje</h3></div>
            <HerramientaPanel departamento="General" herramienta={GENERAL_PLAN_RODAJE} fullName={fullName} editable={ce("plan")} />
          </div>
        )}
        {sub === "orden" && <OrdenRodajePanel fullName={fullName} canEdit={ce("orden")} />}
        {sub === "contactos" && (
          <div className="hp-open">
            {!ce("contactos") && <ReadOnlyBanner propietario="Producción" />}
            <div className="hp-open-head"><h3><span className="hex"></span> Contactos de emergencia</h3></div>
            <HerramientaPanel departamento="General" herramienta={GENERAL_CONTACTOS_EMERGENCIA} fullName={fullName} editable={ce("contactos")} />
          </div>
        )}
        {sub === "wrap" && (
          <div className="hp-open">
            {!ce("wrap") && <ReadOnlyBanner propietario="Producción" />}
            <div className="hp-open-head"><h3><span className="hex"></span> Checklist de cierre de rodaje</h3></div>
            <HerramientaPanel departamento="General" herramienta={GENERAL_CHECKLIST_WRAP} fullName={fullName} editable={ce("wrap")} />
          </div>
        )}
      </div>
    </div>
  );
}

function ReadOnlyBanner({ propietario }: { propietario: string }) {
  return (
    <div className="gen-readonly-banner">
      <span className="hex"></span>
      Solo visionado — la edición corresponde a <strong>{propietario}</strong>. Solicitá cambios a través de Producción Ejecutiva.
    </div>
  );
}
