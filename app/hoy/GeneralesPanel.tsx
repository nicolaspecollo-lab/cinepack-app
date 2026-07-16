"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
import { ACCENTS } from "../constants";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import Icon from "../components/Icon";
import Hcard from "./Hcard";

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

// Ícono del sello hexagonal de cada herramienta general — ver Hcard.tsx.
const ICON_POR_SUB: Record<Sub, React.ComponentProps<typeof Icon>["name"]> = {
  comunicados: "message",
  consultas: "message",
  notificaciones: "bell",
  guion: "file-text",
  guiontec: "film",
  calendario: "calendar",
  plan: "clock",
  orden: "list",
  escena3d: "cube",
  espacio: "layout",
  visionado: "image",
  equipo: "users",
  accesos: "key",
  pipeline: "briefcase",
  contactos: "phone",
  wrap: "checklist",
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
  { id: "notificaciones", label: "Notificaciones",       desc: "Centro de alertas globales del proyecto.",                editores: ["Ejecutivo"],                                                  visores: ["Ejecutivo"],             cond: (d) => d === "Ejecutivo" },
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

function deptColor(dept: string) {
  return `var(--${ACCENTS[dept] ?? "lime"})`;
}

function DeptHexes({ label, depts }: { label: React.ReactNode; depts: string[] | null | "todos" }) {
  const tG = useTranslations("generales");
  if (depts === null) {
    return (
      <span className="hcard-perm-group">
        <span className="hcard-perm-label">{label}</span>
        <span className="hcard-badge">{tG("all")}</span>
      </span>
    );
  }
  if (depts === "todos") {
    return (
      <span className="hcard-perm-group">
        <span className="hcard-perm-label">{label}</span>
        <span className="hcard-badge">{tG("all")}</span>
      </span>
    );
  }
  if (depts.length === 0) return null;
  return (
    <span className="hcard-perm-group">
      <span className="hcard-perm-label">{label}</span>
      {depts.map((d) => (
        <span
          key={d}
          className="hcard-dept-hex"
          style={{ background: deptColor(d) }}
          title={d}
        />
      ))}
    </span>
  );
}

export default function GeneralesPanel({
  departamento,
  cargo,
  fullName,
  jumpTo,
}: {
  departamento: string;
  cargo?: string | null;
  fullName: string;
  jumpTo?: { sub: Sub; token: number } | null;
}) {
  const tG = useTranslations("generales");
  const subs = SUBS.filter((s) => !s.cond || s.cond(departamento));
  const [sub, setSub] = useState<Sub | null>(null);
  const [backMounted, setBackMounted] = useState(false);
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

  useEffect(() => {
    setBackMounted(!!document.getElementById("cp-header-back"));
  }, []);

  const ce = (s: Sub) => canEditSub(s, departamento);

  if (sub === null) {
    return (
      <div className="hp-index">
        <div>
          <div className="hp-group-label hp-group-label-muted" style={{ marginBottom: "12px" }}>
            {tG("sharedTools")}
          </div>
          <div className="hp-cards">
            {subs.map((s) => (
              <Hcard
                key={s.id}
                icon={ICON_POR_SUB[s.id]}
                title={tG(`${s.id}.label`)}
                desc={tG(`${s.id}.desc`)}
                badgeCount={pendientesPorSub[s.id]}
                onClick={() => setSub(s.id)}
                footer={
                  <>
                    <DeptHexes label={<Icon name="pencil" size={11} />} depts={s.editores} />
                    <DeptHexes label={<Icon name="eye" size={11} />} depts={s.visores} />
                  </>
                }
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gen">
      {backMounted && createPortal(
        <button className="cp-header-back-btn" onClick={() => setSub(null)}><Icon name="arrow-left" size={14} /> {tG("back")}</button>,
        document.getElementById("cp-header-back")!
      )}

      <div className="gen-body">
        {sub === "comunicados" && <ComunicadosPanel deDepartamento={departamento} cargo={cargo} fullName={fullName} />}
        {sub === "notificaciones" && <NotificacionesPanel />}
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
          <HerramientaPanel departamento="General" herramienta={GENERAL_CALENDARIO} fullName={fullName} editable={ce("calendario")} />
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
