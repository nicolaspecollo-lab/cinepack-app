"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

const TIPO_LABEL_KEY: Record<Tipo, string> = {
  perfil: "tipoPerfil",
  consulta_nueva: "tipoConsulta",
  consulta_respuesta: "tipoRespuesta",
  consulta_resuelta: "tipoResuelta",
  comunicado: "tipoComunicado",
  acceso_solicitud: "tipoAcceso",
  acceso_resuelto: "tipoAcceso",
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

function timeAgo(iso: string, t: ReturnType<typeof useTranslations>) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("timeNow");
  if (mins < 60) return t("timeMinsAgo", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("timeHoursAgo", { n: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t("timeYesterday");
  return t("timeDaysAgo", { n: days });
}

export default function NotificacionesPanel() {
  const t = useTranslations("notificaciones");
  const tHp = useTranslations("hp");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const projectId = localStorage.getItem("cinepack-proyecto-id");

      // Cambios de perfil: solo de usuarios que integran ESTE proyecto (no toda
      // la plataforma). Se resuelve primero la lista de miembros del proyecto.
      let cambiosRes: { data: any[] | null } = { data: [] };
      if (projectId) {
        const { data: miembros } = await supabase
          .from("project_members")
          .select("user_id")
          .eq("project_id", projectId);
        const userIds = (miembros ?? []).map((m) => m.user_id);
        cambiosRes = userIds.length
          ? await supabase
              .from("perfil_cambios")
              .select("*")
              .in("user_id", userIds)
              .order("created_at", { ascending: false })
              .limit(100)
          : { data: [] };
      }

      const [consultasRes, comunicadosRes, accesosRes] = await Promise.all([
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
          titulo: t("profileUpdated", { user: c.user_nombre, field: c.campo }),
          meta: timeAgo(c.created_at, tHp),
          detalle:
            c.campo === "Contraseña" || c.campo === "Foto de perfil"
              ? null
              : t("beforeAfter", { before: c.valor_anterior || "—", after: c.valor_nuevo || "—" }),
          created_at: c.created_at,
        });
      }

      for (const c of consultasRes.data ?? []) {
        lista.push({
          id: `consulta-${c.id}`,
          tipo: "consulta_nueva",
          titulo: t("queryOpened", { author: c.autor_nombre, dept: c.de_departamento, to: c.para_departamentos.join(", "), title: c.titulo }),
          meta: timeAgo(c.created_at, tHp),
          detalle: c.texto,
          created_at: c.created_at,
        });

        for (let i = 0; i < (c.respuestas ?? []).length; i++) {
          const r = c.respuestas[i];
          lista.push({
            id: `consulta-${c.id}-respuesta-${i}`,
            tipo: "consulta_respuesta",
            titulo: t("queryReplied", { author: r.autor_nombre, dept: r.departamento, title: c.titulo }),
            meta: timeAgo(r.created_at, tHp),
            detalle: r.texto,
            created_at: r.created_at,
          });
        }

        if (c.estado === "resuelta") {
          lista.push({
            id: `consulta-${c.id}-resuelta`,
            tipo: "consulta_resuelta",
            titulo: t("queryResolved", { author: c.respuesta_autor, title: c.titulo }),
            meta: timeAgo(c.resolved_at ?? c.created_at, tHp),
            detalle: c.respuesta,
            created_at: c.resolved_at ?? c.created_at,
          });
        }
      }

      for (const c of comunicadosRes.data ?? []) {
        lista.push({
          id: `comunicado-${c.id}`,
          tipo: "comunicado",
          titulo: t("announcementPosted", { author: c.autor_nombre, dept: c.de_departamento, title: c.titulo }),
          meta: timeAgo(c.created_at, tHp),
          detalle: c.texto,
          created_at: c.created_at,
        });
      }

      for (const a of accesosRes.data ?? []) {
        const accesoTxt = a.tipo_acceso === "edicion" ? t("accessEdit") : t("accessView");
        lista.push({
          id: `acceso-${a.id}`,
          tipo: "acceso_solicitud",
          titulo: t("accessRequested", { requester: a.solicitante_nombre, dept: a.de_departamento, accessType: accesoTxt, tool: a.herramienta, toDept: a.para_departamento }),
          meta: timeAgo(a.created_at, tHp),
          detalle: a.motivo,
          created_at: a.created_at,
        });

        if (a.estado !== "pendiente" && a.resolved_at) {
          lista.push({
            id: `acceso-${a.id}-resuelto`,
            tipo: "acceso_resuelto",
            titulo: t("accessResolved", { resolver: a.resuelto_por, verb: a.estado === "aprobada" ? t("accessApproved") : t("accessRejected"), dept: a.de_departamento, tool: a.herramienta, toDept: a.para_departamento }),
            meta: timeAgo(a.resolved_at, tHp),
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
    return <p style={{ fontSize: 12, color: "var(--muted)" }}>{t("loading")}</p>;
  }

  if (eventos.length === 0) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>{t("emptyTitle")}</h4>
        <p>{t("emptyDesc")}</p>
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
              <span className={`pill ${TIPO_CLASS[e.tipo]}`}>{t(TIPO_LABEL_KEY[e.tipo])}</span>
            </div>
            {isOpen && e.detalle && <div className="cons-text noti-detalle">{e.detalle}</div>}
          </div>
        );
      })}
    </div>
  );
}
