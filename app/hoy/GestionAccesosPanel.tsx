"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useEquipo } from "./useEquipo";

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

export default function GestionAccesosPanel({ departamento }: { departamento: string }) {
  const { miembros, loading: loadingEquipo } = useEquipo(departamento);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [herramienta, setHerramienta] = useState(HERRAMIENTAS_GENERALES[0]);
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
      {departamento === "Ejecutivo" && <WebhookSettingsPanel />}

      <p className="cons-text" style={{ padding: "20px 30px 0", margin: 0 }}>
        Confirmá, por herramienta, quién de {departamento} puede <b>editar</b> (Editor) y quién solo{" "}
        <b>visionar</b> (Visionario). Por defecto nadie tiene acceso marcado: el equipo ve sus
        herramientas asignadas por cargo, y aquí das el ok formal o lo movés a otra persona.
      </p>

      <div className="acc-toolbar">
        <div className="cp-select">
          <select value={herramienta} onChange={(e) => setHerramienta(e.target.value)}>
            {HERRAMIENTAS_GENERALES.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <span className="cp-select-arrow"></span>
        </div>
      </div>

      <div className="acc-table-wrap">
        <table className="acc-table">
          <thead>
            <tr>
              <th>Integrante</th>
              <th>Cargo</th>
              <th>Editor</th>
              <th>Visionario</th>
            </tr>
          </thead>
          <tbody>
            {miembros.map((m) => {
              const val = valorPara(m.user_id, herramienta);
              const busy = saving === `${m.user_id}:${herramienta}`;
              return (
                <tr key={m.user_id}>
                  <td>{m.full_name}</td>
                  <td className="acc-cargo">{m.cargo ?? "Sin cargo"}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={val?.editor ?? false}
                      disabled={busy}
                      onChange={() => toggle(m.user_id, m.full_name, herramienta, "editor")}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={val?.visionario ?? false}
                      disabled={busy}
                      onChange={() => toggle(m.user_id, m.full_name, herramienta, "visionario")}
                    />
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
