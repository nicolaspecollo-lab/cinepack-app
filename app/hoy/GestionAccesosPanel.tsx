"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useEquipo } from "./useEquipo";
import { deptTools, cargoGroups } from "../herramientas";
import Icon from "../components/Icon";

// Herramientas Generales del mapa de trabajo (prototipo/mapa_herramientas.html).
// Toda persona del proyecto las tiene disponibles; aquí la cabeza de equipo
// confirma quién puede editar (Editor) y quién solo visionar (Visionario).
const HERRAMIENTAS_GENERALES = [
  "Hoy",
  "Comunicados",
  "Notificaciones",
  "Consultas",
  "Calendario general del proyecto",
  "Guion",
  "Guion Técnico",
  "Plan de rodaje",
  "Orden de rodaje (callsheet)",
  "Escena 3D",
  "Espacio de trabajo editable",
];

type Asignacion = {
  id: string;
  herramienta: string;
  user_id: string;
  editor: boolean;
  visionario: boolean;
};

function WebhookSettingsPanel() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) {
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase.from("proyectos").select("webhook_url").eq("id", projectId).maybeSingle();
      setUrl(data?.webhook_url ?? "");
      setLoading(false);
    })();
  }, []);

  async function guardar() {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    setSaving(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("proyectos").update({ webhook_url: url.trim() || null }).eq("id", projectId);
    setSaving(false);
    setMsg(error ? error.message : "Guardado.");
    setTimeout(() => setMsg(null), 2500);
  }

  if (loading) return null;

  return (
    <div className="tcard" style={{ margin: "20px 30px 0" }}>
      <h4>
        <span className="hex"></span>Webhook de alertas críticas
      </h4>
      <p className="cons-text" style={{ margin: "0 0 10px" }}>
        Cuando se cree una alerta marcada como <b>crítica</b>, se enviará un mensaje a esta URL (compatible con
        Slack/Discord incoming webhooks). Dejá el campo vacío para desactivar.
      </p>
      <div className="cp-share-form">
        <input
          type="url"
          placeholder="https://hooks.slack.com/services/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="button" className="btn acc" onClick={guardar} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {msg && <p className="hp-error" style={{ color: "var(--lime)" }}>{msg}</p>}
    </div>
  );
}

export default function GestionAccesosPanel({
  departamento,
  scope = "general",
}: {
  departamento: string;
  scope?: "general" | "departamento";
}) {
  // Herramientas según el scope
  const herramientasList: string[] = scope === "departamento"
    ? [
        ...deptTools(departamento).map((h) => h.nombre),
        ...cargoGroups(departamento).flatMap((g) => g.tools.map((h) => `${g.cargo} · ${h.nombre}`)),
      ]
    : HERRAMIENTAS_GENERALES;

  const { miembros, loading: loadingEquipo } = useEquipo(departamento);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [herramienta, setHerramienta] = useState(herramientasList[0] ?? "");
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("herramienta_asignaciones")
      .select("id, herramienta, user_id, editor, visionario")
      .eq("project_id", projectId)
      .eq("departamento", departamento);
    setAsignaciones((data ?? []) as Asignacion[]);
    setLoading(false);
  }, [departamento]);

  useEffect(() => {
    load();
  }, [load]);

  function valorPara(userId: string, h: string) {
    return asignaciones.find((a) => a.user_id === userId && a.herramienta === h);
  }

  async function toggle(userId: string, userName: string, h: string, campo: "editor" | "visionario") {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;

    const supabase = createClient();
    const { data: { user: actor } } = await supabase.auth.getUser();
    const actual = valorPara(userId, h);
    const next = {
      editor: campo === "editor" ? !(actual?.editor ?? false) : actual?.editor ?? false,
      visionario: campo === "visionario" ? !(actual?.visionario ?? false) : actual?.visionario ?? false,
    };

    setSaving(`${userId}:${h}`);
    await supabase.from("herramienta_asignaciones").upsert(
      {
        project_id: projectId,
        departamento,
        herramienta: h,
        user_id: userId,
        user_name: userName,
        editor: next.editor,
        visionario: next.visionario,
        updated_at: new Date().toISOString(),
        updated_by: actor?.id ?? null,
      },
      { onConflict: "project_id,departamento,herramienta,user_id" }
    );
    setSaving(null);
    await load();
  }

  if (loading || loadingEquipo) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Cargando accesos del equipo…</h4>
      </div>
    );
  }

  if (miembros.length === 0) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Sin integrantes todavía</h4>
        <p>Cuando se sumen personas a {departamento}, vas a poder asignarles herramientas y dar el ok de Editor/Visionario aquí.</p>
      </div>
    );
  }

  return (
    <>
      {departamento === "Ejecutivo" && scope === "general" && <WebhookSettingsPanel />}

      <p className="cons-text" style={{ padding: "20px 30px 0", margin: 0 }}>
        {scope === "departamento"
          ? <>Definí, por herramienta de <b>{departamento}</b>, quién puede <b>editar</b> y quién solo <b>visionar</b>. Los cambios aplican al instante.</>
          : <>Confirmá, por herramienta, quién de {departamento} puede <b>editar</b> (Editor) y quién solo <b>visionar</b> (Visionario).</>
        }
      </p>

      <div className="acc-toolbar">
        <div className="cp-select">
          <select value={herramienta} onChange={(e) => setHerramienta(e.target.value)}>
            {herramientasList.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <span className="cp-select-arrow"></span>
        </div>
        {saving && <span className="acc-saving">Guardando…</span>}
      </div>

      <div className="acc-table-wrap">
        <table className="acc-table">
          <thead>
            <tr>
              <th>Integrante</th>
              <th>Cargo</th>
              <th className="acc-th-role">
                <span className="acc-role-label acc-role-editor"><Icon name="pencil" size={12} /> Editor</span>
              </th>
              <th className="acc-th-role">
                <span className="acc-role-label acc-role-veedor"><Icon name="eye" size={12} /> Veedor</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {miembros.map((m) => {
              const val = valorPara(m.user_id, herramienta);
              const busy = saving === `${m.user_id}:${herramienta}`;
              return (
                <tr key={m.user_id} className={busy ? "acc-row-busy" : ""}>
                  <td className="acc-td-name">{m.full_name}</td>
                  <td className="acc-cargo">{m.cargo ?? "Sin cargo"}</td>
                  <td className="acc-td-check">
                    <button
                      className={`acc-toggle ${val?.editor ? "on" : ""}`}
                      disabled={busy}
                      onClick={() => toggle(m.user_id, m.full_name, herramienta, "editor")}
                      title={val?.editor ? "Quitar editor" : "Dar editor"}
                    >
                      {val?.editor ? "✓" : "—"}
                    </button>
                  </td>
                  <td className="acc-td-check">
                    <button
                      className={`acc-toggle ${val?.visionario ? "on veedor" : ""}`}
                      disabled={busy}
                      onClick={() => toggle(m.user_id, m.full_name, herramienta, "visionario")}
                      title={val?.visionario ? "Quitar veedor" : "Dar veedor"}
                    >
                      {val?.visionario ? "✓" : "—"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
