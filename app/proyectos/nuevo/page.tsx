"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEPARTAMENTOS, ACCENTS, JERARQUIA_POR_DEPARTAMENTO, TIPOS_PROYECTO } from "../../constants";
import { useTheme } from "../../useTheme";
import ThemeToggle from "../../components/ThemeToggle";
import "../../cp-theme.css";

const CARGO_CUSTOM = "__custom__";

type Persona = { full_name: string; email: string; cargo: string; cargoCustom: string };
type Invite = { full_name: string; email: string; departamento: string; cargo: string | null; token: string };

export default function NuevoProyectoPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [deptos, setDeptos] = useState<string[]>([]);
  const [personas, setPersonas] = useState<Record<string, Persona[]>>({});

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

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
    })();
  }, [router]);

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
    if (!nombre.trim()) {
      setMsg({ type: "err", text: "Ponle un nombre al proyecto." });
      return;
    }
    if (!tipo) {
      setMsg({ type: "err", text: "Elegí el tipo de proyecto." });
      return;
    }
    if (deptos.length === 0) {
      setMsg({ type: "err", text: "Seleccioná al menos un departamento." });
      return;
    }

    const todasLasPersonas = deptos.flatMap((d) =>
      (personas[d] ?? []).map((p) => ({ ...p, departamento: d }))
    );
    for (const p of todasLasPersonas) {
      if (!p.full_name.trim() || !p.email.trim()) {
        setMsg({ type: "err", text: "Completá nombre y email de cada integrante, o quitá la fila." });
        return;
      }
      if (p.cargo === CARGO_CUSTOM && !p.cargoCustom.trim()) {
        setMsg({ type: "err", text: `Escribí el cargo de ${p.full_name || "la persona"} en "Redactar cargo".` });
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

    const { data: proyecto, error: errProyecto } = await supabase
      .from("proyectos")
      .insert({ nombre: nombre.trim(), tipo, departamentos: deptos })
      .select("id")
      .single();

    if (errProyecto || !proyecto) {
      setSaving(false);
      setMsg({ type: "err", text: errProyecto?.message ?? "No se pudo crear el proyecto." });
      return;
    }

    await supabase
      .from("project_members")
      .upsert({ project_id: proyecto.id, user_id: user.id, rol: "Ejecutivo" });

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
        setMsg({ type: "err", text: `Proyecto creado, pero falló la generación de invitaciones: ${errInv.message}` });
        return;
      }

      setInvites((insertadas ?? []) as Invite[]);
    } else {
      setInvites([]);
    }

    setSaving(false);
    setMsg({ type: "ok", text: "Proyecto creado correctamente." });
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
          <h4>Verificando acceso…</h4>
        </div>
      </div>
    );
  }

  if (invites !== null) {
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
        <header className="cp-topbar">
          <Link href="/proyectos" className="cp-logo"><img src="/logo-cinepack.png" alt="CINE PACK" /></Link>
          <span className="cp-proj">Proyecto creado</span>
          <div className="cp-spacer"></div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>

        <div className="cp-hero">
          <div className="hexbg"></div>
          <div className="cp-hero-content">
            <span className="eyebrow"><span className="hex"></span> Listo para arrancar</span>
            <h2>”{nombre}” está creado</h2>
            <p>{tipo} · Departamentos involucrados: {deptos.join(" · ")}</p>
          </div>
        </div>

        <div className="cp-np-section">
          {invites.length === 0 ? (
            <p className="asub">No agregaste integrantes todavía. Podés invitarlos más adelante desde el proyecto.</p>
          ) : (
            <div className="cp-np-block">
              <span className="label">Links de invitación</span>
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
                      {copiedToken === inv.token ? "Copiado ✓" : "Copiar link de invitación"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="asub">
            Enviá a cada persona su link de invitación. Al abrirlo van a poder crear su cuenta y
            quedarán asignadas al proyecto, departamento y cargo correspondientes.
          </p>

          <Link href="/proyectos" className="abtn" style={{ textDecoration: "none", alignSelf: "flex-start" }}>
            Ir a mis proyectos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
      <header className="cp-topbar">
        <Link href="/proyectos" className="cp-logo"><img src="/logo-cinepack.png" alt="CINE PACK" /></Link>
        <span className="cp-proj">Nuevo proyecto</span>
        <div className="cp-spacer"></div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <Link href="/proyectos" className="cp-menu-btn" style={{ textDecoration: "none" }}>
          <span className="hex"></span> Cancelar
        </Link>
      </header>

      <div className="cp-hero">
        <div className="hexbg"></div>
        <div className="cp-hero-content">
          <span className="eyebrow"><span className="hex"></span> Producción nueva</span>
          <h2>Armemos el equipo del proyecto</h2>
          <p>
            Elegí los departamentos que van a participar y, opcionalmente, sumá ya a las personas de
            cada equipo. Al crear el proyecto se genera un link de invitación para cada una.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="cp-np-section">
        <div className="cp-np-block">
          <span className="label">Nombre del proyecto</span>
          <label className="afield" style={{ maxWidth: "420px" }}>
            <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Marea Alta" />
          </label>
        </div>

        <div className="cp-np-block">
          <span className="label">Tipo de proyecto</span>
          <p className="asub" style={{ margin: 0 }}>Debe coincidir con el servicio contratado.</p>
          <div className="cp-select" style={{ maxWidth: "420px" }}>
            <select required value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="" disabled>Selecciona un tipo de proyecto</option>
              {TIPOS_PROYECTO.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="cp-select-arrow"></span>
          </div>
        </div>

        <div className="cp-np-block">
          <span className="label">Departamentos involucrados</span>
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
                  <span className="check">{active ? "✓ Seleccionado" : "Agregar"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {deptos.map((d) => (
          <div key={d} className="cp-deptteam" style={{ "--acc": accent(d) } as React.CSSProperties}>
            <h4><span className="hex"></span> Equipo de {d}</h4>

            {(personas[d] ?? []).map((p, idx) => (
              <div key={idx} className="cp-personarow">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={p.full_name}
                  onChange={(e) => updatePersona(d, idx, "full_name", e.target.value)}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={p.email}
                  onChange={(e) => updatePersona(d, idx, "email", e.target.value)}
                />
                <div className="cp-select" style={{ "--acc": accent(d) } as React.CSSProperties}>
                  <select
                    value={p.cargo}
                    onChange={(e) => updatePersona(d, idx, "cargo", e.target.value)}
                  >
                    <option value="">Sin cargo</option>
                    {(JERARQUIA_POR_DEPARTAMENTO[d] ?? []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value={CARGO_CUSTOM}>Redactar cargo…</option>
                  </select>
                  <span className="cp-select-arrow"></span>
                </div>
                {p.cargo === CARGO_CUSTOM && (
                  <input
                    type="text"
                    placeholder="Ej. 3ª Asistencia de dirección"
                    value={p.cargoCustom}
                    onChange={(e) => updatePersona(d, idx, "cargoCustom", e.target.value)}
                  />
                )}
                <button type="button" className="cp-removebtn" onClick={() => removePersona(d, idx)}>
                  Quitar
                </button>
              </div>
            ))}

            <button type="button" className="cp-addbtn" style={{ "--acc": accent(d) } as React.CSSProperties} onClick={() => addPersona(d)}>
              + Agregar persona a {d}
            </button>
          </div>
        ))}

        {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

        <button type="submit" disabled={saving} className="abtn" style={{ alignSelf: "flex-start" }}>
          {saving ? "Creando…" : "Crear proyecto y generar invitaciones"}
        </button>
      </form>
    </div>
  );
}
