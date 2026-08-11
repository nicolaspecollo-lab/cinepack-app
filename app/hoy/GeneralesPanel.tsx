"use client";

import { useEffect, useState } from "react";
import ConsultasPanel from "./ConsultasPanel";
import ComunicadosPanel from "./ComunicadosPanel";
import GuionPanel from "./GuionPanel";
import GuionTecnicoPanel from "./GuionTecnicoPanel";
import EscenasPanel from "./EscenasPanel";
import EspacioTrabajoPanel from "./EspacioTrabajoPanel";
import VisionadoPanel from "./VisionadoPanel";
import EquipoPanel from "./EquipoPanel";
import AccesosPanel from "./AccesosPanel";
import PipelinePanel from "./PipelinePanel";
import HerramientaPanel from "./HerramientaPanel";
import OrdenRodajePanel from "./OrdenRodajePanel";
import CalendarioProyecto from "./CalendarioProyecto";
import { GENERAL_PLAN_RODAJE, GENERAL_CONTACTOS_EMERGENCIA, GENERAL_CHECKLIST_WRAP } from "../herramientas";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

// Las Herramientas Generales del mapa de trabajo, contenidas en una sola pestaña
// que despliega sub-pestañas. Iguales para todo el proyecto.
export type Sub =
  | "comunicados" | "consultas" | "guion" | "guiontec"
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

type SubDef = {
  id: Sub;
  label: string;
  desc: string;
  editores: string[] | null;   // null = todos
  visores: string[] | "todos";
  cond?: (d: string) => boolean;
};

const SUBS: SubDef[] = [
  { id: "comunicados",    label: "Comunicados",          desc: "Avisos y mensajes internos para el equipo.",              editores: null,                                                           visores: "todos" },
  { id: "consultas",      label: "Consultas",            desc: "Canal de preguntas entre departamentos.",                 editores: null,                                                           visores: "todos" },
  { id: "calendario",     label: "Calendario general",   desc: "Hitos globales y fechas del proyecto.",                   editores: ["Producción", "Ejecutivo"],                                    visores: "todos" },
  { id: "guion",          label: "Guion",                desc: "Guion literario compartido con el equipo.",               editores: ["Guion", "Ejecutivo"],                                         visores: "todos" },
  { id: "guiontec",       label: "Guion Técnico",        desc: "Desglose por secuencia y plano técnico.",                 editores: ["Dirección", "Guion", "Ejecutivo"],                            visores: ["Dirección", "Guion", "Producción"] },
  { id: "plan",           label: "Plan de rodaje",       desc: "Cronograma diario de escenas y locaciones.",             editores: ["Producción", "Ejecutivo"],                                    visores: "todos" },
  { id: "orden",          label: "Orden de rodaje",      desc: "Secuencia optimizada por locación y recursos.",          editores: ["Dirección", "Producción", "Ejecutivo"],                       visores: "todos" },
  { id: "escena3d",       label: "Escena 3D",            desc: "Vista agregada de escenas en profundidad.",              editores: [],                                                              visores: "todos" },
  { id: "espacio",        label: "Espacio de trabajo",   desc: "Notas y bloques de trabajo por departamento.",           editores: null,                                                           visores: "todos" },
  { id: "visionado",      label: "Visionado",            desc: "Galería de materiales y referencias visuales.",          editores: ["Dirección", "Arte", "Fotografía", "Postproducción", "Ejecutivo"], visores: "todos" },
  { id: "equipo",         label: "Equipo",               desc: "Listado completo del equipo técnico y artístico.",       editores: ["RRHH", "Ejecutivo"],                                          visores: "todos" },
  { id: "accesos",        label: "Accesos",              desc: "Gestión de permisos por cargo y herramienta.",           editores: ["Ejecutivo"],                                                  visores: ["Ejecutivo"] },
  { id: "pipeline",       label: "Pipeline",             desc: "Financiación, acuerdos y entregables ejecutivos.",       editores: ["Ejecutivo"],                                                  visores: ["Ejecutivo", "Producción"], cond: (d) => d === "Ejecutivo" || d === "Producción" },
  { id: "contactos",      label: "Contactos emergencia", desc: "Teléfonos y contactos clave para urgencias.",            editores: ["Producción", "Ejecutivo"],                                    visores: "todos" },
  { id: "wrap",           label: "Checklist wrap",       desc: "Lista de control para el cierre del rodaje.",            editores: ["Producción", "Ejecutivo"],                                    visores: "todos" },
];

export default function GeneralesPanel({
  departamento,
  cargo,
  fullName,
  jumpTo,
  isAdmin,
}: {
  departamento: string;
  cargo?: string | null;
  fullName: string;
  jumpTo?: { sub: Sub; token: number } | null;
  isAdmin?: boolean;
}) {
  const tG = useTranslations("generales");
  const subs = SUBS.filter((s) => !s.cond || s.cond(departamento));
  const [sub, setSub] = useState<Sub>(jumpTo?.sub ?? subs[0]?.id ?? "comunicados");
  const [pendientesPorSub, setPendientesPorSub] = useState<Partial<Record<Sub, number>>>({});

  useEffect(() => {
    if (jumpTo) setSub(jumpTo.sub);
  }, [jumpTo]);

  // Señalización por card: misma fuente de datos que el badge de la pestaña
  // "Generales" en DepartmentDashboard, pero desagregada por herramienta.
  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) return;
      const supabase = createClient();
      const [{ data: consultas }, { data: comunicados }] = await Promise.all([
        supabase.from("consultas").select("id").eq("project_id", projectId).eq("estado", "pendiente").contains("para_departamentos", [departamento]),
        supabase.from("comunicados").select("id").eq("project_id", projectId).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
      ]);
      setPendientesPorSub({
        consultas: consultas?.length ?? 0,
        comunicados: comunicados?.length ?? 0,
      });
    })();
  }, [departamento, jumpTo]);

  const ce = (s: Sub) => canEditSub(s, departamento);

  return (
    <div className="gen">
      <div className="gen-subtabs">
        {subs.map((s) => (
          <button
            key={s.id}
            className={`gen-subtab ${s.id === sub ? "on" : ""}`}
            onClick={() => setSub(s.id)}
          >
            {tG(`${s.id}.label`)}
            {!!pendientesPorSub[s.id] && <span className="gen-subtab-n">{pendientesPorSub[s.id]}</span>}
          </button>
        ))}
      </div>

      <div className="gen-body">
        {sub === "comunicados" && <ComunicadosPanel deDepartamento={departamento} cargo={cargo} fullName={fullName} />}
        {sub === "consultas" && <ConsultasPanel deDepartamento={departamento} cargo={cargo} fullName={fullName} />}
        {sub === "guion" && <GuionPanel fullName={fullName} canEdit={ce("guion")} />}
        {sub === "guiontec" && <GuionTecnicoPanel fullName={fullName} canEdit={ce("guiontec")} />}
        {sub === "escena3d" && <EscenasPanel departamento={departamento} />}
        {sub === "espacio" && <EspacioTrabajoPanel departamento={departamento} fullName={fullName} />}
        {sub === "visionado" && <VisionadoPanel departamento={departamento} fullName={fullName} />}
        {sub === "equipo" && <EquipoPanel departamento={departamento} />}
        {sub === "accesos" && <AccesosPanel deDepartamento={departamento} fullName={fullName} />}
        {sub === "pipeline" && <PipelinePanel fullName={fullName} />}

        {sub === "calendario" && (
          <CalendarioProyecto departamento={departamento} cargo={cargo} isAdmin={isAdmin} fullName={fullName} variant="full" />
        )}
        {sub === "plan" && (
          <HerramientaPanel departamento="General" herramienta={GENERAL_PLAN_RODAJE} fullName={fullName} editable={ce("plan")} />
        )}
        {sub === "orden" && <OrdenRodajePanel fullName={fullName} canEdit={ce("orden")} />}
        {sub === "contactos" && (
          <HerramientaPanel departamento="General" herramienta={GENERAL_CONTACTOS_EMERGENCIA} fullName={fullName} editable={ce("contactos")} />
        )}
        {sub === "wrap" && (
          <HerramientaPanel departamento="General" herramienta={GENERAL_CHECKLIST_WRAP} fullName={fullName} editable={ce("wrap")} />
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
