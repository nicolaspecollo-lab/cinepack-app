"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEPARTAMENTOS, ACCENTS, JERARQUIA_POR_DEPARTAMENTO, TIPOS_PROYECTO } from "../../constants";
import { useTheme } from "../../useTheme";
import ThemeToggle from "../../components/ThemeToggle";
import CreditosChips from "../../components/CreditosChips";
import "../../cp-theme.css";

const CARGO_CUSTOM = "__custom__";

type Persona = { full_name: string; email: string; cargo: string; cargoCustom: string };
type Invite = { full_name: string; email: string; departamento: string; cargo: string | null; token: string };
type Plantilla = { id: string; nombre: string; tipo: string | null; departamentos: string[] | null };

export default function NuevoProyectoPage() {
  const router = useRouter();
  const t = useTranslations("proyectoNuevo");
  const { theme, toggleTheme } = useTheme();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [escritoPor, setEscritoPor] = useState<string[]>([]);
  const [dirigidoPor, setDirigidoPor] = useState<string[]>([]);
  const [producidoPor, setProducidoPor] = useState<string[]>([]);
  const [deptos, setDeptos] = useState<string[]>([]);
  const [deptoCustomInput, setDeptoCustomInput] = useState("");
  const [personas, setPersonas] = useState<Record<string, Persona[]>>({});
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [plantillaId, setPlantillaId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Gate de pago: solo se activa si beta_mode está OFF y el usuario ya tiene
  // al menos un proyecto (el primer proyecto de cualquiera es siempre gratis).
  const [betaMode, setBetaMode] = useState<boolean | null>(null);
  const [proyectosPrevios, setProyectosPrevios] = useState<number | null>(null);
  const [packElegido, setPackElegido] = useState<string | null>(null);
  const [personalizadoMsg, setPersonalizadoMsg] = useState("");
  const [personalizadoEnviado, setPersonalizadoEnviado] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        router.push("/proyectos");
        return;
      }
      setIsAdmin(true);
      setChecking(false);

      const { data: rows } = await supabase
        .from("project_members")
        .select("proyectos(id, nombre, tipo, departamentos)")
        .eq("user_id", user.id);
      const lista = (rows ?? [])
        .map((row) => row.proyectos as unknown as Plantilla)
        .filter(Boolean);
      setPlantillas(lista);
      setProyectosPrevios(lista.length);

      const { data: flag } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("key", "beta_mode")
        .maybeSingle();
      setBetaMode(flag?.enabled ?? true);
    })();
  }, [router]);

  const requierePago = betaMode === false && (proyectosPrevios ?? 0) > 0;
  const gateResuelto = !requierePago || packElegido !== null || personalizadoEnviado;

  function elegirPlantilla(p: Plantilla) {
    if (plantillaId === p.id) {
      setPlantillaId(null);
      return;
    }
    setPlantillaId(p.id);
    setTipo(p.tipo ?? "");
    setDeptos(p.departamentos ?? []);
    setPersonas({});
  }

  function accent(d: string) {
    return `var(--${ACCENTS[d] ?? "lime"})`;
  }

  function toggleDepto(d: string) {
    setDeptos((prev) => {
      if (prev.includes(d)) {
        const next = prev.filter((x) => x !== d);
        setPersonas((p) => {
          const np = { ...p };
          delete np[d];
          return np;
        });
        return next;
      }
      return [...prev, d];
    });
  }

  function addCustomDepto() {
    const nombre = deptoCustomInput.trim();
    if (!nombre) return;
    if (!deptos.some((d) => d.toLowerCase() === nombre.toLowerCase())) {
      setDeptos((prev) => [...prev, nombre]);
    }
    setDeptoCustomInput("");
  }

  function addPersona(depto: string) {
    setPersonas((prev) => ({
      ...prev,
      [depto]: [...(prev[depto] ?? []), { full_name: "", email: "", cargo: "", cargoCustom: "" }],
    }));
  }

  function removePersona(depto: string, idx: number) {
    setPersonas((prev) => ({
      ...prev,
      [depto]: (prev[depto] ?? []).filter((_, i) => i !== idx),
    }));
  }

  function updatePersona(depto: string, idx: number, field: keyof Persona, value: string) {
    setPersonas((prev) => ({
      ...prev,
      [depto]: (prev[depto] ?? []).map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (requierePago && !gateResuelto) {
      setMsg({ type: "err", text: t("errChoosePackOrQuote") });
      return;
    }
    if (!nombre.trim()) {
      setMsg({ type: "err", text: t("errProjectName") });
      return;
    }
    if (!tipo) {
      setMsg({ type: "err", text: t("errProjectType") });
      return;
    }
    if (deptos.length === 0) {
      setMsg({ type: "err", text: t("errSelectDept") });
      return;
    }

    const todasLasPersonas = deptos.flatMap((d) =>
      (personas[d] ?? []).map((p) => ({ ...p, departamento: d }))
    );
    for (const p of todasLasPersonas) {
      if (!p.full_name.trim() || !p.email.trim()) {
        setMsg({ type: "err", text: t("errCompleteFields") });
        return;
      }
      if (p.cargo === CARGO_CUSTOM && !p.cargoCustom.trim()) {
        setMsg({ type: "err", text: t("errWriteRole", { name: p.full_name || t("personFallback") }) });
        return;
      }
    }

    setSaving(true);
    setMsg(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      router.push("/login");
      return;
    }

    const pagoEstado = !requierePago
      ? "beta_gratis"
      : personalizadoEnviado
      ? "pendiente_personalizado"
      : "pendiente_pago";

    const { data: proyecto, error: errProyecto } = await supabase
      .from("proyectos")
      .insert({
        nombre: nombre.trim(),
        tipo,
        departamentos: deptos,
        pago_estado: pagoEstado,
        pack_tipo: packElegido,
        pack_config: personalizadoEnviado ? { personalizado: true, mensaje: personalizadoMsg.trim() } : null,
        creado_por: user.id,
        escrito_por: escritoPor,
        dirigido_por: dirigidoPor,
        producido_por: producidoPor,
      })
      .select("id")
      .single();

    if (errProyecto || !proyecto) {
      setSaving(false);
      setMsg({ type: "err", text: errProyecto?.message ?? t("errCreateProjectFailed") });
      return;
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      project_id: proyecto.id,
      action: "project_created",
      metadata: { nombre: nombre.trim(), tipo },
    });

    await supabase
      .from("project_members")
      .upsert({ project_id: proyecto.id, user_id: user.id, rol: "Ejecutivo" });

    if (plantillaId) {
      const { data: metas } = await supabase
        .from("herramienta_filas")
        .select("departamento, herramienta_id, datos")
        .eq("project_id", plantillaId)
        .eq("orden", -1);

      if (metas && metas.length > 0) {
        await supabase.from("herramienta_filas").insert(
          metas.map((m) => ({
            project_id: proyecto.id,
            departamento: m.departamento,
            herramienta_id: m.herramienta_id,
            datos: m.datos,
            orden: -1,
          }))
        );
      }
    }

    if (todasLasPersonas.length > 0) {
      const { data: insertadas, error: errInv } = await supabase
        .from("invitaciones")
        .insert(
          todasLasPersonas.map((p) => ({
            project_id: proyecto.id,
            email: p.email.trim(),
            full_name: p.full_name.trim(),
            departamento: p.departamento,
            cargo: p.cargo === CARGO_CUSTOM ? p.cargoCustom.trim() : p.cargo || null,
          }))
        )
        .select("full_name, email, departamento, cargo, token");

      if (errInv) {
        setSaving(false);
        setMsg({ type: "err", text: t("errInviteFailed", { msg: errInv.message }) });
        return;
      }

      setInvites((insertadas ?? []) as Invite[]);
    } else {
      setInvites([]);
    }

    setSaving(false);
    setMsg({ type: "ok", text: t("successCreated") });
  }

  function inviteUrl(token: string) {
    if (typeof window === "undefined") return `/invitacion/${token}`;
    return `${window.location.origin}/invitacion/${token}`;
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((t) => (t === token ? null : t)), 1800);
    } catch {
      // noop
    }
  }

  if (checking || !isAdmin) {
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
        <div className="soon-box" style={{ margin: "24px 30px" }}>
          <span className="hex"></span>
          <h4>{t("checkingAccess")}</h4>
        </div>
      </div>
    );
  }

  if (invites !== null) {
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
        <header className="cp-topbar">
          <Link href="/proyectos" className="cp-logo"><img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" /></Link>
          <span className="cp-proj">{t("projectCreated")}</span>
          <div className="cp-spacer"></div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>

        <div className="cp-hero">
          <div className="hexbg"></div>
          <div className="cp-hero-content">
            <span className="eyebrow"><span className="hex"></span> {t("readyToStart")}</span>
            <h2>{t("createdTitle", { nombre })}</h2>
            <p>{t("createdSub", { tipo, deptos: deptos.join(" · ") })}</p>
          </div>
        </div>

        <div className="cp-np-section">
          {invites.length === 0 ? (
            <p className="asub">{t("noInvitesYet")}</p>
          ) : (
            <div className="cp-np-block">
              <span className="label">{t("inviteLinksLabel")}</span>
              <div className="cp-team-list" style={{ margin: 0 }}>
                {invites.map((inv) => (
                  <div
                    className="cp-team-row"
                    key={inv.token}
                    style={{ flexWrap: "wrap", borderLeft: `3px solid ${accent(inv.departamento)}` }}
                  >
                    <span className="hex" style={{ width: "16px", height: "14px", background: accent(inv.departamento), flexShrink: 0 }}></span>
                    <span className="cp-team-name">{inv.full_name}</span>
                    <span className="cp-team-cargo" style={{ marginRight: "auto" }}>
                      {inv.departamento}{inv.cargo ? ` · ${inv.cargo}` : ""} · {inv.email}
                    </span>
                    <button
                      type="button"
                      className="cp-addbtn"
                      style={{ "--acc": accent(inv.departamento) } as React.CSSProperties}
                      onClick={() => copy(inv.token)}
                    >
                      {copiedToken === inv.token ? t("copied") : t("copyInviteLink")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="asub">{t("shareInvitesDesc")}</p>

          <div className="cp-np-block">
            <span className="label">{t("nextStepsLabel")}</span>
            <div className="cp-onboarding-list">
              <div className="cp-onboarding-item">
                <span className="hex"></span>
                <div>
                  <b>{t("step1Title")}</b>
                  <p>{t("step1Desc")}</p>
                </div>
              </div>
              <div className="cp-onboarding-item">
                <span className="hex"></span>
                <div>
                  <b>{t("step2Title")}</b>
                  <p>{t("step2Desc")}</p>
                </div>
              </div>
              <div className="cp-onboarding-item">
                <span className="hex"></span>
                <div>
                  <b>{t("step3Title")}</b>
                  <p>{t("step3Desc")}</p>
                </div>
              </div>
              <div className="cp-onboarding-item">
                <span className="hex"></span>
                <div>
                  <b>{t("step4Title")}</b>
                  <p>{t("step4Desc")}</p>
                </div>
              </div>
            </div>
          </div>

          <Link href="/proyectos" className="abtn" style={{ textDecoration: "none", alignSelf: "flex-start" }}>
            {t("goToProjects")}
          </Link>
        </div>
      </div>
    );
  }

  if (requierePago && !gateResuelto) {
    const packs = TIPOS_PROYECTO;
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
        <header className="cp-topbar">
          <Link href="/proyectos" className="cp-logo"><img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" /></Link>
          <span className="cp-proj">{t("newProject")}</span>
          <div className="cp-spacer"></div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <Link href="/proyectos" className="cp-menu-btn" style={{ textDecoration: "none" }}>
            <span className="hex"></span> {t("cancel")}
          </Link>
        </header>

        <div className="cp-hero">
          <div className="hexbg"></div>
          <div className="cp-hero-content">
            <span className="eyebrow"><span className="hex"></span> {t("additionalProject")}</span>
            <h2>{t("choosePackTitle")}</h2>
            <p>
              {t.rich("choosePackDesc", {
                n: proyectosPrevios ?? 0,
                link: (chunks) => (
                  <a href="https://cinepack.es/packs.html" target="_blank" rel="noreferrer">{chunks}</a>
                ),
              })}
            </p>
          </div>
        </div>

        <div className="cp-np-section">
          <div className="cp-np-block">
            <span className="label">{t("projectTypePackLabel")}</span>
            <div className="chip-group">
              {packs.map((p) => (
                <button
                  type="button"
                  key={p}
                  className={`dept-chip ${packElegido === p ? "active" : ""}`}
                  style={{ "--chip-acc": "var(--cyan)" } as React.CSSProperties}
                  onClick={() => setPackElegido(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {packElegido && (
            <div className="cp-np-block">
              <div className="soon-box">
                <span className="hex"></span>
                <h4>{t("paymentPendingTitle")}</h4>
                <p>{t("paymentPendingDesc")}</p>
              </div>
            </div>
          )}

          <div className="cp-np-block">
            <span className="label">{t("noneOfThesePacks")}</span>
            <textarea
              value={personalizadoMsg}
              onChange={(e) => setPersonalizadoMsg(e.target.value)}
              rows={3}
              placeholder={t("customMsgPh")}
            />
            <button
              type="button"
              className="btn"
              disabled={!personalizadoMsg.trim()}
              onClick={() => setPersonalizadoEnviado(true)}
              style={{ alignSelf: "flex-start", marginTop: "8px" }}
            >
              {t("requestCustomQuote")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
      <header className="cp-topbar">
        <Link href="/proyectos" className="cp-logo"><img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" /></Link>
        <span className="cp-proj">{t("newProject")}</span>
        <div className="cp-spacer"></div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <Link href="/proyectos" className="cp-menu-btn" style={{ textDecoration: "none" }}>
          <span className="hex"></span> {t("cancel")}
        </Link>
      </header>

      <div className="cp-hero">
        <div className="hexbg"></div>
        <div className="cp-hero-content">
          <span className="eyebrow"><span className="hex"></span> {t("newProduction")}</span>
          <h2>{t("buildTeamTitle")}</h2>
          <p>{t("buildTeamDesc")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="cp-np-section">
        {plantillas.length > 0 && (
          <div className="cp-np-block">
            <span className="label">{t("useTemplateLabel")}</span>
            <p className="asub" style={{ margin: 0 }}>{t("useTemplateDesc")}</p>
            <div className="cp-deptgrid">
              {plantillas.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={`cp-deptcard ${plantillaId === p.id ? "active" : ""}`}
                  onClick={() => elegirPlantilla(p)}
                >
                  <span className="hex"></span>
                  <span className="name">{p.nombre}</span>
                  <span className="check">{plantillaId === p.id ? t("usingTemplate") : t("useTemplate")}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="cp-np-block">
          <span className="label">{t("projectNameLabel")}</span>
          <label className="afield" style={{ maxWidth: "420px" }}>
            <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t("projectNamePh")} />
          </label>
        </div>

        <div className="cp-np-block">
          <span className="label">{t("projectTypeLabel")}</span>
          <p className="asub" style={{ margin: 0 }}>{t("projectTypeDesc")}</p>
          <div className="cp-select" style={{ maxWidth: "420px" }}>
            <select required value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="" disabled>{t("selectProjectType")}</option>
              {TIPOS_PROYECTO.map((tp) => (
                <option key={tp} value={tp}>{tp}</option>
              ))}
            </select>
            <span className="cp-select-arrow"></span>
          </div>
        </div>

        <CreditosChips label={t("writtenByOpt")} placeholder={t("writerNamePh")} valores={escritoPor} onChange={setEscritoPor} addLabel={t("add")} />
        <CreditosChips label={t("directedByOpt")} placeholder={t("directorNamePh")} valores={dirigidoPor} onChange={setDirigidoPor} addLabel={t("add")} />
        <CreditosChips label={t("producedByOpt")} placeholder={t("producerNamePh")} valores={producidoPor} onChange={setProducidoPor} addLabel={t("add")} />

        <div className="cp-np-block">
          <span className="label">{t("deptsInvolvedLabel")}</span>
          <div className="cp-deptgrid">
            {DEPARTAMENTOS.map((d) => {
              const active = deptos.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  className={`cp-deptcard ${active ? "active" : ""}`}
                  style={{ "--acc": accent(d) } as React.CSSProperties}
                  onClick={() => toggleDepto(d)}
                >
                  <span className="hex"></span>
                  <span className="name">{d}</span>
                  <span className="check">{active ? t("selected") : t("add")}</span>
                </button>
              );
            })}
            {deptos.filter((d) => !DEPARTAMENTOS.includes(d)).map((d) => (
              <button
                type="button"
                key={d}
                className="cp-deptcard active"
                style={{ "--acc": accent(d) } as React.CSSProperties}
                onClick={() => toggleDepto(d)}
                title={t("removeDeptTitle")}
              >
                <span className="hex"></span>
                <span className="name">{d}</span>
                <span className="check">{t("customRemove")}</span>
              </button>
            ))}
          </div>
          <div className="cp-deptcustom">
            <input
              type="text"
              placeholder={t("missingDeptPh")}
              value={deptoCustomInput}
              onChange={(e) => setDeptoCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomDepto(); } }}
            />
            <button type="button" className="abtn" onClick={addCustomDepto}>
              {t("addNewDept")}
            </button>
          </div>
        </div>

        {deptos.map((d) => (
          <div key={d} className="cp-deptteam" style={{ "--acc": accent(d) } as React.CSSProperties}>
            <h4><span className="hex"></span> {t("teamOf", { dept: d })}</h4>

            {(personas[d] ?? []).map((p, idx) => (
              <div key={idx} className="cp-personarow">
                <input
                  type="text"
                  placeholder={t("fullNamePh")}
                  value={p.full_name}
                  onChange={(e) => updatePersona(d, idx, "full_name", e.target.value)}
                />
                <EmailInput
                  value={p.email}
                  onChange={(v) => updatePersona(d, idx, "email", v)}
                />
                <div className="cp-select" style={{ "--acc": accent(d) } as React.CSSProperties}>
                  <select
                    value={p.cargo}
                    onChange={(e) => updatePersona(d, idx, "cargo", e.target.value)}
                  >
                    <option value="">{t("noRole")}</option>
                    {(JERARQUIA_POR_DEPARTAMENTO[d] ?? []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value={CARGO_CUSTOM}>{t("writeRole")}</option>
                  </select>
                  <span className="cp-select-arrow"></span>
                </div>
                {p.cargo === CARGO_CUSTOM && (
                  <input
                    type="text"
                    placeholder={t("customRolePh")}
                    value={p.cargoCustom}
                    onChange={(e) => updatePersona(d, idx, "cargoCustom", e.target.value)}
                  />
                )}
                <button type="button" className="cp-removebtn" onClick={() => removePersona(d, idx)}>
                  {t("remove")}
                </button>
              </div>
            ))}

            <button type="button" className="cp-addbtn" style={{ "--acc": accent(d) } as React.CSSProperties} onClick={() => addPersona(d)}>
              {t("addPersonTo", { dept: d })}
            </button>
          </div>
        ))}

        {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

        <button type="submit" disabled={saving} className="abtn" style={{ alignSelf: "flex-start" }}>
          {saving ? t("creating") : t("createAndInvite")}
        </button>
      </form>
    </div>
  );
}

type EmailStatus = { status: "idle" | "checking" | "registered" | "invited" | "not_found" | "invalid"; full_name?: string; departamento?: string; cargo?: string };

function EmailInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("proyectoNuevo");
  const [emailStatus, setEmailStatus] = useState<EmailStatus>({ status: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!v.trim()) { setEmailStatus({ status: "idle" }); return; }
    setEmailStatus({ status: "checking" });
    timerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/check-email?email=${encodeURIComponent(v.trim())}`);
      const data = await res.json() as EmailStatus;
      setEmailStatus(data);
    }, 600);
  }

  return (
    <div className="cp-email-wrap">
      <input type="email" placeholder={t("emailPh")} value={value} onChange={handleChange} />
      {emailStatus.status === "checking" && (
        <span className="cp-email-hint checking">{t("checkingEmail")}</span>
      )}
      {emailStatus.status === "registered" && (
        <span className="cp-email-hint ok">{t("alreadyRegistered", { name: emailStatus.full_name ?? "", dept: emailStatus.departamento ?? "" })}</span>
      )}
      {emailStatus.status === "invited" && (
        <span className="cp-email-hint warn">{t("pendingInviteFor", { name: emailStatus.full_name ?? "" })}</span>
      )}
      {emailStatus.status === "not_found" && (
        <span className="cp-email-hint info">{t("validNoAccount")}</span>
      )}
      {emailStatus.status === "invalid" && (
        <span className="cp-email-hint err">{t("invalidEmail")}</span>
      )}
    </div>
  );
}
