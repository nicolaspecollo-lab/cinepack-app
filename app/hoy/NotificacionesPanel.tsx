"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tipo =
  | "perfil"
  | "consulta_nueva"
  | "consulta_respuesta"
  | "consulta_resuelta"
  | "comunicado"
  | "acceso_solicitud"
  | "acceso_resuelto";

type Evento = {
  id: string;
  tipo: Tipo;
  titulo: string;
  meta: string;
  detalle: string | null;
  created_at: string;
};

const TIPO_LABEL: Record<Tipo, string> = {
  perfil: "Perfil",
  consulta_nueva: "Consulta",
  consulta_respuesta: "Respuesta",
  consulta_resuelta: "Resuelta",
  comunicado: "Comunicado",
  acceso_solicitud: "Acceso",
  acceso_resuelto: "Acceso",
};

const TIPO_CLASS: Record<Tipo, string> = {
  perfil: "tag-perfil",
  consulta_nueva: "tag-con",
  consulta_respuesta: "tag-sug",
  consulta_resuelta: "p-ok",
  comunicado: "tag-comunicado",
  acceso_solicitud: "tag-info",
  acceso_resuelto: "p-ok",
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

export default function NotificacionesPanel() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const projectId = localStorage.getItem("cinepack-proyecto-id");

      const [cambiosRes, consultasRes, comunicadosRes, accesosRes] = await Promise.all([
        supabase.from("perfil_cambios").select("*").order("created_at", { ascending: false }).limit(100),
        projectId
          ? supabase.from("consultas").select("*").eq("project_id", projectId).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
        projectId
          ? supabase.from("comunicados").select("*").eq("project_id", projectId).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
        projectId
          ? supabase.from("acceso_solicitudes").select("*").eq("project_id", projectId).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const lista: Evento[] = [];

      for (const c of cambiosRes.data ?? []) {
        lista.push({
          id: `perfil-${c.id}`,
          tipo: "perfil",
          titulo: `${c.user_nombre} actualizó su perfil: ${c.campo}`,
          meta: timeAgo(c.created_at),
          detalle:
            c.campo === "Contraseña" || c.campo === "Foto de perfil"
              ? null
              : `Antes: ${c.valor_anterior || "—"} → Ahora: ${c.valor_nuevo || "—"}`,
          created_at: c.created_at,
        });
      }

      for (const c of consultasRes.data ?? []) {
        lista.push({
          id: `consulta-${c.id}`,
          tipo: "consulta_nueva",
          titulo: `${c.autor_nombre} (${c.de_departamento}) abrió una consulta para ${c.para_departamentos.join(", ")}: ${c.titulo}`,
          meta: timeAgo(c.created_at),
          detalle: c.texto,
          created_at: c.created_at,
        });

        for (let i = 0; i < (c.respuestas ?? []).length; i++) {
          const r = c.respuestas[i];
          lista.push({
            id: `consulta-${c.id}-respuesta-${i}`,
            tipo: "consulta_respuesta",
            titulo: `${r.autor_nombre} (${r.departamento}) respondió a "${c.titulo}"`,
            meta: timeAgo(r.created_at),
            detalle: r.texto,
            created_at: r.created_at,
          });
        }

        if (c.estado === "resuelta") {
          lista.push({
            id: `consulta-${c.id}-resuelta`,
            tipo: "consulta_resuelta",
            titulo: `${c.respuesta_autor} resolvió "${c.titulo}"`,
            meta: timeAgo(c.resolved_at ?? c.created_at),
            detalle: c.respuesta,
            created_at: c.resolved_at ?? c.created_at,
          });
        }
      }

      for (const c of comunicadosRes.data ?? []) {
        lista.push({
          id: `comunicado-${c.id}`,
          tipo: "comunicado",
          titulo: `${c.autor_nombre} (${c.de_departamento}) publicó un comunicado: ${c.titulo}`,
          meta: timeAgo(c.created_at),
          detalle: c.texto,
          created_at: c.created_at,
        });
      }

      for (const a of accesosRes.data ?? []) {
        const accesoTxt = a.tipo_acceso === "edicion" ? "edición" : "visionado";
        lista.push({
          id: `acceso-${a.id}`,
          tipo: "acceso_solicitud",
          titulo: `${a.solicitante_nombre} (${a.de_departamento}) solicitó acceso de ${accesoTxt} a ${a.herramienta} de ${a.para_departamento}`,
          meta: timeAgo(a.created_at),
          detalle: a.motivo,
          created_at: a.created_at,
        });

        if (a.estado !== "pendiente" && a.resolved_at) {
          lista.push({
            id: `acceso-${a.id}-resuelto`,
            tipo: "acceso_resuelto",
            titulo: `${a.resuelto_por} ${a.estado === "aprobada" ? "aprobó" : "rechazó"} el acceso de ${a.de_departamento} a ${a.herramienta} de ${a.para_departamento}`,
            meta: timeAgo(a.resolved_at),
            detalle: null,
            created_at: a.resolved_at,
          });
        }
      }

      lista.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setEventos(lista);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <p style={{ fontSize: 12, color: "var(--muted)" }}>Cargando…</p>;
  }

  if (eventos.length === 0) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Sin actividad todavía</h4>
        <p>Las consultas, respuestas, comunicados y cambios de perfil de todo el equipo aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="cons-list">
      {eventos.map((e) => {
        const isOpen = open === e.id;
        return (
          <div
            className="cons noti-item"
            key={e.id}
            onClick={() => e.detalle && setOpen(isOpen ? null : e.id)}
          >
            <div className="cons-top">
              <div>
                <div className="cons-title">{e.titulo}</div>
                <span className="cons-meta">{e.meta}</span>
              </div>
              <span className={`pill ${TIPO_CLASS[e.tipo]}`}>{TIPO_LABEL[e.tipo]}</span>
            </div>
            {isOpen && e.detalle && <div className="cons-text noti-detalle">{e.detalle}</div>}
          </div>
        );
      })}
    </div>
  );
}
