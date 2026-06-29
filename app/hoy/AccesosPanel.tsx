"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { DEPARTAMENTOS } from "../constants";

const HERRAMIENTAS = ["Documentos", "Consultas", "Comunicados", "Guion", "Guion Técnico", "Escenas"];

type Solicitud = {
  id: string;
  solicitante_id: string;
  solicitante_nombre: string;
  de_departamento: string;
  para_departamento: string;
  herramienta: string;
  tipo_acceso: "visionado" | "edicion";
  motivo: string | null;
  estado: "pendiente" | "aprobada" | "rechazada";
  resuelto_por: string | null;
  created_at: string;
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

export default function AccesosPanel({
  deDepartamento,
  fullName,
}: {
  deDepartamento: string;
  fullName: string;
}) {
  const t = useTranslations("accesos");
  const [userId, setUserId] = useState<string | null>(null);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [paraDepartamento, setParaDepartamento] = useState("");
  const [herramienta, setHerramienta] = useState(HERRAMIENTAS[0]);
  const [tipoAcceso, setTipoAcceso] = useState<"visionado" | "edicion">("visionado");
  const [motivo, setMotivo] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const { data } = await supabase
      .from("acceso_solicitudes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setSolicitudes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setMsg({ type: "err", text: t("errNoProject") });
      return;
    }
    if (!paraDepartamento) {
      setMsg({ type: "err", text: t("errSelectDept") });
      return;
    }

    setSending(true);
    setMsg(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return;
    }

    const { error } = await supabase.from("acceso_solicitudes").insert({
      project_id: projectId,
      solicitante_id: user.id,
      solicitante_nombre: fullName,
      de_departamento: deDepartamento,
      para_departamento: paraDepartamento,
      herramienta,
      tipo_acceso: tipoAcceso,
      motivo: motivo || null,
    });

    setSending(false);

    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }

    setParaDepartamento("");
    setHerramienta(HERRAMIENTAS[0]);
    setTipoAcceso("visionado");
    setMotivo("");
    setShowForm(false);
    await load();
  }

  async function resolver(id: string, estado: "aprobada" | "rechazada") {
    const supabase = createClient();
    await supabase
      .from("acceso_solicitudes")
      .update({ estado, resuelto_por: fullName, resolved_at: new Date().toISOString() })
      .eq("id", id);
    await load();
  }

  const esEjecutivo = deDepartamento === "Ejecutivo";

  return (
    <>
      <div className="cons-list">
        {loading && <p className="cons-text">{t("loading")}</p>}
        {!loading && solicitudes.length === 0 && (
          <div className="soon-box">
            <span className="hex"></span>
            <h4>{t("noRequestsTitle")}</h4>
            <p>{t("noRequestsDesc")}</p>
          </div>
        )}
        {solicitudes.map((s) => {
          const esMia = s.solicitante_id === userId;
          const puedeResolver =
            s.estado === "pendiente" && (esEjecutivo || s.para_departamento === deDepartamento) && !esMia;
          const pillClass =
            s.estado === "aprobada" ? "p-ok" : s.estado === "rechazada" ? "p-bad" : "p-warn";
          const pillLabel =
            s.estado === "aprobada" ? t("approved") : s.estado === "rechazada" ? t("rejected") : t("pending");
          return (
            <div className="cons" key={s.id}>
              <div className="cons-top">
                <div>
                  <div className="cons-title">
                    {s.de_departamento} → {s.para_departamento} · {s.herramienta}{" "}
                    <span className={`pill ${s.tipo_acceso === "edicion" ? "tag-con" : "tag-info"}`}>
                      {s.tipo_acceso === "edicion" ? t("edit") : t("view")}
                    </span>
                  </div>
                  <span className="cons-meta">
                    {s.solicitante_nombre} · {timeAgo(s.created_at, t)}
                    {s.resuelto_por ? t("resolvedBy", { verb: pillLabel.toLowerCase(), name: s.resuelto_por }) : ""}
                  </span>
                </div>
                <span className={`pill ${pillClass}`}>
                  {s.estado === "pendiente" && <span className="pulse"></span>}
                  {pillLabel}
                </span>
              </div>
              {s.motivo && <div className="cons-text">{s.motivo}</div>}

              {puedeResolver && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                  <button className="btn acc" onClick={() => resolver(s.id, "aprobada")}>
                    {t("approve")}
                  </button>
                  <button className="btn" onClick={() => resolver(s.id, "rechazada")}>
                    {t("reject")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="cons-new">
        <button className="btn acc" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t("cancel") : t("requestAccess")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="cons-new" style={{ flexDirection: "column", maxWidth: "560px", paddingTop: 0 }}>
          <label className="afield">
            <span>{t("fieldRequestTo")}</span>
            <select value={paraDepartamento} onChange={(e) => setParaDepartamento(e.target.value)}>
              <option value="">{t("selectDept")}</option>
              {DEPARTAMENTOS.filter((d) => d !== deDepartamento).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="afield">
            <span>{t("fieldTool")}</span>
            <select value={herramienta} onChange={(e) => setHerramienta(e.target.value)}>
              {HERRAMIENTAS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <label className="afield">
            <span>{t("fieldAccessType")}</span>
            <select value={tipoAcceso} onChange={(e) => setTipoAcceso(e.target.value as "visionado" | "edicion")}>
              <option value="visionado">{t("viewOnly")}</option>
              <option value="edicion">{t("editAccess")}</option>
            </select>
          </label>
          <label className="afield">
            <span>{t("fieldReason")}</span>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              placeholder={t("reasonPlaceholder")}
            />
          </label>

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <button type="submit" className="abtn" disabled={sending}>
            {sending ? t("sending") : t("sendRequest")}
          </button>
        </form>
      )}
    </>
  );
}
