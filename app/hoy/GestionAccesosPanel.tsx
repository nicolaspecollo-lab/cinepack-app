"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useEquipoProyecto } from "./useEquipoProyecto";
import { deptTools, cargoGroups } from "../herramientas";
import { DEPARTAMENTOS } from "../constants";
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
  departamento: string;
  user_id: string;
  editor: boolean;
  visionario: boolean;
  updated_at: string | null;
  updated_by: string | null;
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

  const t = useTranslations("gestionAccesos");

  async function guardar() {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    setSaving(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("proyectos").update({ webhook_url: url.trim() || null }).eq("id", projectId);
    setSaving(false);
    setMsg(error ? error.message : t("saved"));
    setTimeout(() => setMsg(null), 2500);
  }

  if (loading) return null;

  return (
    <div className="tcard" style={{ margin: "20px 30px 0" }}>
      <h4>
        <span className="hex"></span>{t("webhookTitle")}
      </h4>
      <p className="cons-text" style={{ margin: "0 0 10px" }}>
        {t("webhookDesc", { critical: t("critical") })}
      </p>
      <div className="cp-share-form">
        <input
          type="url"
          placeholder="https://hooks.slack.com/services/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="button" className="btn acc" onClick={guardar} disabled={saving}>
          {saving ? t("saving") : t("save")}
        </button>
      </div>
      {msg && <p className="hp-error" style={{ color: "var(--lime)" }}>{msg}</p>}
    </div>
  );
}

// Nombre de la herramienta tal como se guarda en herramienta_asignaciones:
// las de departamento van con su nombre solo, las exclusivas de cargo con
// el prefijo "Cargo · Nombre" (mismo formato que usaba el panel anterior,
// para no romper las filas ya guardadas).
function opcionesHerramientas(departamento: string): { label: string; value: string }[] {
  const generales = HERRAMIENTAS_GENERALES.map((n) => ({ label: `General · ${n}`, value: n }));
  const deptos = deptTools(departamento).map((h) => ({ label: h.nombre, value: h.nombre }));
  const exclusivas = cargoGroups(departamento).flatMap((g) =>
    g.tools.map((h) => ({ label: `${g.cargo} · ${h.nombre}`, value: `${g.cargo} · ${h.nombre}` }))
  );
  return [...generales, ...deptos, ...exclusivas];
}

export default function GestionAccesosPanel({
  departamento,
}: {
  departamento: string;
  scope?: "general" | "departamento";
}) {
  const t = useTranslations("gestionAccesos");
  const { grupos, loading: loadingEquipo } = useEquipoProyecto();
  const todos = useMemo(
    () => grupos.flatMap((g) => g.miembros.map((m) => ({ ...m, departamento: g.departamento }))),
    [grupos]
  );
  const nombrePorId = useMemo(() => new Map(todos.map((m) => [m.user_id, m.full_name])), [todos]);

  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<(typeof todos)[number] | null>(null);

  const [deptElegido, setDeptElegido] = useState(departamento);
  const [toolQuery, setToolQuery] = useState("");
  const [toolElegido, setToolElegido] = useState<string | null>(null);
  const [accion, setAccion] = useState<"editor" | "visionario" | "quitar" | null>(null);

  const [profileTab, setProfileTab] = useState<"general" | "departamento" | "exclusivas">("general");

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("herramienta_asignaciones")
      .select("id, herramienta, departamento, user_id, editor, visionario, updated_at, updated_by")
      .eq("project_id", projectId);
    setAsignaciones((data ?? []) as Asignacion[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const userMatches = userQuery.trim()
    ? todos.filter((m) => m.full_name.toLowerCase().includes(userQuery.trim().toLowerCase()))
    : [];

  const toolOpciones = useMemo(() => opcionesHerramientas(deptElegido), [deptElegido]);
  const toolMatches = toolQuery.trim()
    ? toolOpciones.filter((o) => o.label.toLowerCase().includes(toolQuery.trim().toLowerCase()))
    : toolOpciones;

  function elegirUsuario(m: (typeof todos)[number]) {
    setSelectedUser(m);
    setUserQuery(m.full_name);
    setDeptElegido(m.departamento);
    setToolQuery("");
    setToolElegido(null);
    setAccion(null);
    setProfileTab("general");
  }

  async function aplicar() {
    if (!selectedUser || !toolElegido || !accion) return;
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user: actor },
    } = await supabase.auth.getUser();
    const actual = asignaciones.find(
      (a) => a.departamento === deptElegido && a.herramienta === toolElegido && a.user_id === selectedUser.user_id
    );
    const next = {
      editor: accion === "editor" ? true : accion === "quitar" ? false : actual?.editor ?? false,
      visionario: accion === "visionario" ? true : accion === "quitar" ? false : actual?.visionario ?? false,
    };
    await supabase.from("herramienta_asignaciones").upsert(
      {
        project_id: projectId,
        departamento: deptElegido,
        herramienta: toolElegido,
        user_id: selectedUser.user_id,
        user_name: selectedUser.full_name,
        editor: next.editor,
        visionario: next.visionario,
        updated_at: new Date().toISOString(),
        updated_by: actor?.id ?? null,
      },
      { onConflict: "project_id,departamento,herramienta,user_id" }
    );
    setSaving(false);
    setAccion(null);
    setToolElegido(null);
    setToolQuery("");
    await load();
  }

  const asignacionesUsuario = selectedUser
    ? asignaciones.filter((a) => a.user_id === selectedUser.user_id && (a.editor || a.visionario))
    : [];

  const permisosGeneral = asignacionesUsuario.filter((a) => HERRAMIENTAS_GENERALES.includes(a.herramienta));
  const permisosDepto = asignacionesUsuario.filter(
    (a) => a.departamento === selectedUser?.departamento && !a.herramienta.includes(" · ") && !HERRAMIENTAS_GENERALES.includes(a.herramienta)
  );
  const permisosExclusivas = asignacionesUsuario.filter(
    (a) => a.departamento === selectedUser?.departamento && a.herramienta.includes(" · ")
  );

  const historialUsuario = selectedUser
    ? [...asignaciones.filter((a) => a.user_id === selectedUser.user_id && a.updated_at)].sort(
        (a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
      )
    : [];

  if (loading || loadingEquipo) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>{t("loading")}</h4>
      </div>
    );
  }

  const permisosPorTab = { general: permisosGeneral, departamento: permisosDepto, exclusivas: permisosExclusivas }[profileTab];

  return (
    <>
      {departamento === "Ejecutivo" && <WebhookSettingsPanel />}

      <p className="cons-text" style={{ padding: "20px 30px 0", margin: 0 }}>
        {t("descGeneral", { dept: departamento, edit: t("edit"), view: t("view") })}
      </p>

      <div className="acc-grant">
        <div className="acc-grant-h">
          <Icon name="sliders" size={13} />
          {t("stepByStep")}
        </div>
        <div className="acc-steps">
          <div className="acc-step">
            <span>1. {t("colMember")}</span>
            <input
              placeholder={t("searchUser")}
              value={userQuery}
              onChange={(e) => {
                setUserQuery(e.target.value);
                setSelectedUser(null);
              }}
            />
            {userQuery.trim() && !selectedUser && userMatches.length > 0 && (
              <div className="acc-suggest">
                {userMatches.slice(0, 8).map((m) => (
                  <div key={m.user_id} className="acc-suggest-row" onClick={() => elegirUsuario(m)}>
                    <span className="acc-suggest-name">{m.full_name}</span>
                    <span className="acc-suggest-dept">{m.departamento}{m.cargo ? ` · ${m.cargo}` : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <span className="acc-arrow">›</span>
          <div className="acc-step">
            <span>2. {t("department")}</span>
            <div className="cp-select">
              <select value={deptElegido} onChange={(e) => { setDeptElegido(e.target.value); setToolElegido(null); setToolQuery(""); }}>
                {DEPARTAMENTOS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <span className="cp-select-arrow"></span>
            </div>
          </div>
          <span className="acc-arrow">›</span>
          <div className="acc-step acc-step-tool">
            <span>3. {t("tool")}</span>
            <input
              placeholder={t("searchTool")}
              value={toolElegido ?? toolQuery}
              onChange={(e) => { setToolQuery(e.target.value); setToolElegido(null); }}
              onFocus={() => setToolElegido(null)}
            />
            {!toolElegido && toolMatches.length > 0 && (
              <div className="acc-suggest">
                {toolMatches.slice(0, 10).map((o) => (
                  <div key={o.label} className="acc-suggest-row" onClick={() => { setToolElegido(o.value); setToolQuery(o.label); }}>
                    <span className="acc-suggest-name">{o.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="acc-step-accion">
          <span>4. {t("action")}</span>
          <div className="acc-actionbtns">
            <button type="button" className={`editor${accion === "editor" ? " on" : ""}`} onClick={() => setAccion("editor")}>{t("grantEditorBtn")}</button>
            <button type="button" className={`view${accion === "visionario" ? " on" : ""}`} onClick={() => setAccion("visionario")}>{t("grantViewerBtn")}</button>
            <button type="button" className={`quitar${accion === "quitar" ? " on" : ""}`} onClick={() => setAccion("quitar")}>{t("revokeBtn")}</button>
          </div>
        </div>
        <button
          type="button"
          className="acc-apply"
          disabled={!selectedUser || !toolElegido || !accion || saving}
          onClick={aplicar}
        >
          {saving ? t("saving") : t("apply")}
        </button>
      </div>

      {selectedUser && (
        <div className="acc-profile">
          <div className="acc-p-head">
            <span className="acc-p-av">{selectedUser.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span>
            <div>
              <div className="acc-p-name">{selectedUser.full_name}</div>
              <div className="acc-p-role">{selectedUser.cargo ?? t("noRole")} · {selectedUser.departamento}</div>
            </div>
          </div>
          <div className="acc-p-body">
            <div>
              <div className="acc-p-tabs">
                <span className={`acc-p-tab${profileTab === "general" ? " on" : ""}`} onClick={() => setProfileTab("general")}>{t("tabGeneral")}</span>
                <span className={`acc-p-tab${profileTab === "departamento" ? " on" : ""}`} onClick={() => setProfileTab("departamento")}>{t("tabDept")}</span>
                <span className={`acc-p-tab${profileTab === "exclusivas" ? " on" : ""}`} onClick={() => setProfileTab("exclusivas")}>{t("tabExclusivas")}</span>
              </div>
              {permisosPorTab.length === 0 ? (
                <p className="acc-p-empty">{t("noAccess")}</p>
              ) : (
                permisosPorTab.map((a) => (
                  <div className="acc-perm" key={a.id}>
                    {a.herramienta}
                    <span className={`acc-perm-badge${a.editor ? " editor" : " veedor"}`}>{a.editor ? t("editor") : t("viewer")}</span>
                  </div>
                ))
              )}
            </div>
            <div>
              <div className="acc-p-h6">{t("auditTitle")}</div>
              {historialUsuario.length === 0 ? (
                <p className="acc-p-empty">{t("noHistory")}</p>
              ) : (
                historialUsuario.slice(0, 12).map((a) => (
                  <div className="acc-log" key={a.id}>
                    <span className={`acc-log-dot${a.editor || a.visionario ? " on" : " off"}`}></span>
                    <div>
                      <div>
                        <b>{a.updated_by ? nombrePorId.get(a.updated_by) ?? t("unknownUser") : t("unknownUser")}</b>{" "}
                        {a.editor || a.visionario
                          ? t("auditGranted", { role: a.editor ? t("editor") : t("viewer"), tool: a.herramienta })
                          : t("auditRevoked", { tool: a.herramienta })}
                      </div>
                      <div className="acc-log-date">{a.updated_at ? new Date(a.updated_at).toLocaleDateString() : ""}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
