"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { DEPARTAMENTOS, JERARQUIA_POR_DEPARTAMENTO } from "../constants";
import { CICLO_SELECT, ETAPAS, fechasCicloDesdeFila, type FechasCiclo } from "./cicloVida";
import CreditosChips from "../components/CreditosChips";

type Cambio = {
  user_nombre: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  created_at: string;
};

type Miembro = { user_id: string; full_name: string; departamento: string };

export default function AdminPanel() {
  const t = useTranslations("admin");
  const tEtapas = useTranslations("etapas");
  const [loading, setLoading] = useState(true);
  const [proyectoId, setProyectoId] = useState<string | null>(null);

  const [fechasCiclo, setFechasCiclo] = useState<FechasCiclo>({
    desarrollo: null, financiacion: null, preproduccion: null, rodaje: null, postproduccion: null, distribucion: null,
  });
  const [savingCiclo, setSavingCiclo] = useState(false);
  const [cicloMsg, setCicloMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [conteosDepto, setConteosDepto] = useState<Record<string, number>>({});
  const [conteosCargo, setConteosCargo] = useState<Record<string, number>>({});
  const [cambios, setCambios] = useState<Cambio[]>([]);
  const [miembros, setMiembros] = useState<Miembro[]>([]);

  const [asignarUserId, setAsignarUserId] = useState("");
  const [asignarDepto, setAsignarDepto] = useState("");
  const [asignarCargo, setAsignarCargo] = useState("");
  const [asignando, setAsignando] = useState(false);
  const [asignarMsg, setAsignarMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [departamentosProyecto, setDepartamentosProyecto] = useState<string[]>([]);
  const [deptoNuevoInput, setDeptoNuevoInput] = useState("");
  const [agregandoDepto, setAgregandoDepto] = useState(false);

  const [escritoPor, setEscritoPor] = useState<string[]>([]);
  const [dirigidoPor, setDirigidoPor] = useState<string[]>([]);
  const [producidoPor, setProducidoPor] = useState<string[]>([]);
  const [savingCreditos, setSavingCreditos] = useState(false);
  const [creditosMsg, setCreditosMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [inviteNombre, setInviteNombre] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDepto, setInviteDepto] = useState("");
  const [inviteCargo, setInviteCargo] = useState("");
  const [invitando, setInvitando] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

  function timeAgo(iso: string) {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return t("timeNow");
    if (mins < 60) return t("timeMinsAgo", { n: mins });
    const h = Math.floor(mins / 60);
    if (h < 24) return t("timeHoursAgo", { n: h });
    const d = Math.floor(h / 24);
    return d === 1 ? t("timeYesterday") : t("timeDaysAgo", { n: d });
  }

  async function load() {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    setProyectoId(projectId);
    const supabase = createClient();

    const { data: proyecto } = await supabase
      .from("proyectos")
      .select(CICLO_SELECT)
      .eq("id", projectId)
      .single();
    if (proyecto) {
      setFechasCiclo(fechasCicloDesdeFila(proyecto));
    }

    const { data: proyectoExtra } = await supabase
      .from("proyectos")
      .select("departamentos, escrito_por, dirigido_por, producido_por")
      .eq("id", projectId)
      .single();
    if (proyectoExtra) {
      setDepartamentosProyecto(proyectoExtra.departamentos ?? []);
      setEscritoPor((proyectoExtra.escrito_por as string[]) ?? []);
      setDirigidoPor((proyectoExtra.dirigido_por as string[]) ?? []);
      setProducidoPor((proyectoExtra.producido_por as string[]) ?? []);
    }

    const { data: members } = await supabase
      .from("project_members")
      .select("user_id, rol, profiles(full_name)")
      .eq("project_id", projectId);
    const listaMiembros = (members ?? [])
      .map((row) => {
        const p = row.profiles as unknown as { full_name: string } | null;
        if (!p) return null;
        return { user_id: row.user_id as string, full_name: p.full_name, departamento: row.rol as string };
      })
      .filter((m): m is Miembro => m !== null);
    setMiembros(listaMiembros);

    const cDepto: Record<string, number> = {};
    for (const m of listaMiembros) cDepto[m.departamento] = (cDepto[m.departamento] ?? 0) + 1;
    setConteosDepto(cDepto);

    const userIds = listaMiembros.map((m) => m.user_id);
    if (userIds.length > 0) {
      const { data: roles } = await supabase.from("user_roles").select("cargo").in("user_id", userIds);
      const cCargo: Record<string, number> = {};
      for (const r of roles ?? []) cCargo[r.cargo] = (cCargo[r.cargo] ?? 0) + 1;
      setConteosCargo(cCargo);
    }

    // Actividad reciente: solo de integrantes de ESTE proyecto (userIds ya
    // resuelto arriba desde project_members) — nunca perfil_cambios global.
    const { data: cambiosData } = userIds.length > 0
      ? await supabase
          .from("perfil_cambios")
          .select("user_nombre, campo, valor_anterior, valor_nuevo, created_at")
          .in("user_id", userIds)
          .order("created_at", { ascending: false })
          .limit(20)
      : { data: [] };
    setCambios(cambiosData ?? []);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function guardarCiclo(e: React.FormEvent) {
    e.preventDefault();
    if (!proyectoId) return;
    setSavingCiclo(true);
    setCicloMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("proyectos")
      .update({
        fase_desarrollo_inicio: fechasCiclo.desarrollo || null,
        fase_financiacion_inicio: fechasCiclo.financiacion || null,
        fase_preproduccion_inicio: fechasCiclo.preproduccion || null,
        fase_rodaje_inicio: fechasCiclo.rodaje || null,
        fase_postproduccion_inicio: fechasCiclo.postproduccion || null,
        fase_distribucion_inicio: fechasCiclo.distribucion || null,
      })
      .eq("id", proyectoId);
    setSavingCiclo(false);
    if (error) {
      setCicloMsg({ type: "err", text: error.message });
      return;
    }
    setCicloMsg({ type: "ok", text: t("lifecycleUpdated") });
  }

  async function asignarCargoCompartido(e: React.FormEvent) {
    e.preventDefault();
    if (!asignarUserId || !asignarCargo) return;
    setAsignando(true);
    setAsignarMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("user_roles").insert({ user_id: asignarUserId, cargo: asignarCargo });
    setAsignando(false);
    if (error) {
      setAsignarMsg({ type: "err", text: error.code === "23505" ? t("roleExists") : error.message });
      return;
    }
    setAsignarMsg({ type: "ok", text: t("roleAssigned") });
    setAsignarCargo("");
    await load();
  }

  async function guardarCreditos(e: React.FormEvent) {
    e.preventDefault();
    if (!proyectoId) return;
    setSavingCreditos(true);
    setCreditosMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("proyectos")
      .update({ escrito_por: escritoPor, dirigido_por: dirigidoPor, producido_por: producidoPor })
      .eq("id", proyectoId);
    setSavingCreditos(false);
    if (error) {
      setCreditosMsg({ type: "err", text: error.message });
      return;
    }
    setCreditosMsg({ type: "ok", text: t("creditsUpdated") });
  }

  async function agregarDepartamento(e: React.FormEvent) {
    e.preventDefault();
    const nombre = deptoNuevoInput.trim();
    if (!nombre || !proyectoId) return;
    if (departamentosProyecto.some((d) => d.toLowerCase() === nombre.toLowerCase())) {
      setDeptoNuevoInput("");
      return;
    }
    setAgregandoDepto(true);
    const nuevos = [...departamentosProyecto, nombre];
    const supabase = createClient();
    const { error } = await supabase.from("proyectos").update({ departamentos: nuevos }).eq("id", proyectoId);
    setAgregandoDepto(false);
    if (!error) {
      setDepartamentosProyecto(nuevos);
      setDeptoNuevoInput("");
    }
  }

  async function enviarInvitacion(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteNombre.trim() || !inviteEmail.trim() || !inviteDepto || !proyectoId) return;
    setInvitando(true);
    setInviteMsg(null);
    setInviteLink(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("invitaciones")
      .insert({
        project_id: proyectoId,
        email: inviteEmail.trim(),
        full_name: inviteNombre.trim(),
        departamento: inviteDepto,
        cargo: inviteCargo || null,
      })
      .select("token")
      .single();
    setInvitando(false);
    if (error || !data) {
      setInviteMsg({ type: "err", text: error?.message ?? t("errNoInvite") });
      return;
    }
    if (!departamentosProyecto.some((d) => d.toLowerCase() === inviteDepto.toLowerCase())) {
      const nuevos = [...departamentosProyecto, inviteDepto];
      await supabase.from("proyectos").update({ departamentos: nuevos }).eq("id", proyectoId);
      setDepartamentosProyecto(nuevos);
    }
    setInviteLink(`${window.location.origin}/invitacion/${data.token}`);
    setInviteMsg({ type: "ok", text: t("inviteCreated") });
    setInviteNombre("");
    setInviteEmail("");
    setInviteCargo("");
  }

  if (loading) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>{t("loading")}</h4>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <section className="apanel">
        <h3><span className="hex"></span>{t("lifecycleTitle")}</h3>
        <p className="asub">{t("lifecycleDesc")}</p>
        <form onSubmit={guardarCiclo} className="afields-grid">
          {ETAPAS.map((etapa) => (
            <label className="afield" key={etapa.key}>
              <span>{tEtapas(etapa.key)}</span>
              <input
                type="date"
                value={fechasCiclo[etapa.key] ?? ""}
                onChange={(e) => setFechasCiclo((f) => ({ ...f, [etapa.key]: e.target.value || null }))}
              />
            </label>
          ))}
          <div className="afield-span2">
            {cicloMsg && <p className={`amsg ${cicloMsg.type === "err" ? "err" : "ok"}`}>{cicloMsg.text}</p>}
            <button type="submit" className="btn acc" disabled={savingCiclo}>
              {savingCiclo ? t("saving") : t("saveLifecycle")}
            </button>
          </div>
        </form>
      </section>

      <section className="apanel">
        <h3><span className="hex"></span>{t("oversightTitle")}</h3>
        <div className="akpi-grid">
          {Object.entries(conteosDepto).map(([depto, count]) => (
            <div key={depto} className="akpi">
              <div className="akpi-label">{depto}</div>
              <div className="akpi-num">{count}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="apanel">
        <h3><span className="hex"></span>{t("rolesStatsTitle")}</h3>
        <div className="acargo-chips">
          {Object.entries(conteosCargo).length === 0 ? (
            <span className="acargo-empty">{t("noRolesYet")}</span>
          ) : (
            Object.entries(conteosCargo).map(([cargo, count]) => (
              <span key={cargo} className="acargo-chip">
                {cargo}<b>{count}</b>
              </span>
            ))
          )}
        </div>
      </section>

      <section className="apanel">
        <h3><span className="hex"></span>{t("sharedRoleTitle")}</h3>
        <p className="asub">{t("sharedRoleDesc")}</p>
        <form onSubmit={asignarCargoCompartido} className="afields-grid">
          <label className="afield">
            <span>{t("fieldUser")}</span>
            <select value={asignarUserId} onChange={(e) => setAsignarUserId(e.target.value)}>
              <option value="">{t("select")}</option>
              {miembros.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name} ({m.departamento})</option>
              ))}
            </select>
          </label>
          <label className="afield">
            <span>{t("fieldRoleDept")}</span>
            <select value={asignarDepto} onChange={(e) => { setAsignarDepto(e.target.value); setAsignarCargo(""); }}>
              <option value="">{t("select")}</option>
              {Object.keys(JERARQUIA_POR_DEPARTAMENTO).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="afield">
            <span>{t("fieldRole")}</span>
            <select value={asignarCargo} onChange={(e) => setAsignarCargo(e.target.value)} disabled={!asignarDepto}>
              <option value="">{t("select")}</option>
              {(JERARQUIA_POR_DEPARTAMENTO[asignarDepto] ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="afield-span2">
            {asignarMsg && <p className={`amsg ${asignarMsg.type === "err" ? "err" : "ok"}`}>{asignarMsg.text}</p>}
            <button type="submit" className="btn acc" disabled={asignando || !asignarUserId || !asignarCargo}>
              {asignando ? t("assigning") : t("assignRole")}
            </button>
          </div>
        </form>
      </section>

      <section className="apanel">
        <h3><span className="hex"></span>{t("creditsTitle")}</h3>
        <p className="asub">{t("creditsDesc")}</p>
        <form onSubmit={guardarCreditos}>
          <CreditosChips label={t("writtenBy")} placeholder={t("writtenByPh")} valores={escritoPor} onChange={setEscritoPor} addLabel={t("addCredit")} />
          <CreditosChips label={t("directedBy")} placeholder={t("directedByPh")} valores={dirigidoPor} onChange={setDirigidoPor} addLabel={t("addCredit")} />
          <CreditosChips label={t("producedBy")} placeholder={t("producedByPh")} valores={producidoPor} onChange={setProducidoPor} addLabel={t("addCredit")} />
          {creditosMsg && <p className={`amsg ${creditosMsg.type === "err" ? "err" : "ok"}`}>{creditosMsg.text}</p>}
          <button type="submit" className="btn acc" disabled={savingCreditos} style={{ marginTop: "10px" }}>
            {savingCreditos ? t("saving") : t("saveCredits")}
          </button>
        </form>
      </section>

      <section className="apanel">
        <h3><span className="hex"></span>{t("addDeptTitle")}</h3>
        <p className="asub">{t("currentDepts", { list: departamentosProyecto.length > 0 ? departamentosProyecto.join(", ") : t("noneYet") })}</p>
        <form onSubmit={agregarDepartamento} style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder={t("newDeptPlaceholder")}
            value={deptoNuevoInput}
            onChange={(e) => setDeptoNuevoInput(e.target.value)}
            style={{ flex: 1, minWidth: "220px", padding: "10px 12px", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--text)", borderRadius: "4px", fontSize: "14px" }}
          />
          <button type="submit" className="btn acc" disabled={agregandoDepto || !deptoNuevoInput.trim()}>
            {agregandoDepto ? t("adding") : t("addDept")}
          </button>
        </form>
      </section>

      <section className="apanel">
        <h3><span className="hex"></span>{t("addUserTitle")}</h3>
        <p className="asub">{t("addUserDesc")}</p>
        <form onSubmit={enviarInvitacion} className="afields-grid">
          <label className="afield">
            <span>{t("fieldFullName")}</span>
            <input type="text" required value={inviteNombre} onChange={(e) => setInviteNombre(e.target.value)} />
          </label>
          <label className="afield">
            <span>{t("fieldEmail")}</span>
            <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          </label>
          <label className="afield">
            <span>{t("fieldDept")}</span>
            <select required value={inviteDepto} onChange={(e) => { setInviteDepto(e.target.value); setInviteCargo(""); }}>
              <option value="">{t("select")}</option>
              {Array.from(new Set([...DEPARTAMENTOS, ...departamentosProyecto])).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="afield">
            <span>{t("fieldRoleOptional")}</span>
            <select value={inviteCargo} onChange={(e) => setInviteCargo(e.target.value)} disabled={!inviteDepto}>
              <option value="">{t("noRole")}</option>
              {(JERARQUIA_POR_DEPARTAMENTO[inviteDepto] ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="afield-span2">
            {inviteMsg && <p className={`amsg ${inviteMsg.type === "err" ? "err" : "ok"}`}>{inviteMsg.text}</p>}
            {inviteLink && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
                <code style={{ flex: 1, fontSize: "12px", padding: "8px 10px", background: "var(--hl3)", border: "1px solid var(--line)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inviteLink}</code>
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    await navigator.clipboard.writeText(inviteLink);
                    setLinkCopiado(true);
                    setTimeout(() => setLinkCopiado(false), 2000);
                  }}
                >
                  {linkCopiado ? t("copied") : t("copyLink")}
                </button>
              </div>
            )}
            <button type="submit" className="btn acc" disabled={invitando}>
              {invitando ? t("generating") : t("generateInvite")}
            </button>
          </div>
        </form>
      </section>

      <section className="apanel">
        <h3><span className="hex"></span>{t("changeLogTitle")}</h3>
        <div className="alog">
          {cambios.length === 0 ? (
            <span className="alog-empty">{t("noChanges")}</span>
          ) : (
            cambios.map((c, i) => (
              <div key={i} className="alog-item">
                <b>{c.user_nombre}</b> {t("changed")} {c.campo}
                <div className="alog-detail">
                  {c.valor_anterior} → {c.valor_nuevo} · {timeAgo(c.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
