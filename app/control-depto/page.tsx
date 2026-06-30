"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { JERARQUIA_POR_DEPARTAMENTO } from "../constants";
import { deptTools, cargoGroups, type Herramienta } from "../herramientas";
import { useNombreHerramienta } from "../hoy/HerramientasPanel";
import GestionAccesosPanel from "../hoy/GestionAccesosPanel";
import { useTheme } from "../useTheme";
import ThemeToggle from "../components/ThemeToggle";
import "../cp-theme.css";

type Miembro = {
  user_id: string;
  full_name: string;
  cargo: string | null;
  avatar_url: string | null;
  cargosCompartidos: string[];
};

type HerramientaDept = { h: Herramienta; cargo: string | null };

export default function ControlDeptPage() {
  const router = useRouter();
  const t = useTranslations("controlDepto");
  const { theme, toggleTheme } = useTheme();
  const nombreDe = useNombreHerramienta();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [departamento, setDepartamento] = useState("");
  const [projectId, setProjectId] = useState("");
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargoCompartidoNuevo, setCargoCompartidoNuevo] = useState<Record<string, string>>({});
  const [cargosCustom, setCargosCustom] = useState<string[]>([]);
  const [cargoNuevoInput, setCargoNuevoInput] = useState("");
  const [cargoNuevoMsg, setCargoNuevoMsg] = useState<string | null>(null);
  const [herramientasOcultas, setHerramientasOcultas] = useState<Set<string>>(new Set());
  const [togglingTool, setTogglingTool] = useState<string | null>(null);

  const jerarquia = [...(JERARQUIA_POR_DEPARTAMENTO[departamento] ?? []), ...cargosCustom];

  async function cargarCargosCustom(supabase: ReturnType<typeof createClient>, pid: string, dept: string) {
    const { data } = await supabase
      .from("cargos_personalizados")
      .select("nombre")
      .eq("project_id", pid)
      .eq("departamento", dept)
      .order("created_at");
    setCargosCustom((data ?? []).map((r) => r.nombre));
  }

  async function cargarVisibilidad(supabase: ReturnType<typeof createClient>, pid: string, dept: string) {
    const { data } = await supabase
      .from("herramienta_visibilidad")
      .select("herramienta")
      .eq("project_id", pid)
      .eq("departamento", dept)
      .eq("oculta", true);
    setHerramientasOcultas(new Set((data ?? []).map((r) => r.herramienta)));
  }

  async function crearCargo(e: React.FormEvent) {
    e.preventDefault();
    const nombre = cargoNuevoInput.trim();
    if (!nombre || !projectId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("cargos_personalizados")
      .insert({ project_id: projectId, departamento, nombre });
    if (error) {
      setCargoNuevoMsg(t("errCreateRole", { msg: error.message }));
      return;
    }
    setCargosCustom((prev) => [...prev, nombre]);
    setCargoNuevoInput("");
    setCargoNuevoMsg(null);
  }

  async function toggleHerramienta(herramientaId: string, ocultarAhora: boolean) {
    if (!projectId) return;
    setTogglingTool(herramientaId);
    const supabase = createClient();
    const { error } = await supabase
      .from("herramienta_visibilidad")
      .upsert(
        { project_id: projectId, departamento, herramienta: herramientaId, oculta: ocultarAhora },
        { onConflict: "project_id,departamento,herramienta" }
      );
    setTogglingTool(null);
    if (error) {
      alert(t("errToggleTool", { msg: error.message }));
      return;
    }
    setHerramientasOcultas((prev) => {
      const next = new Set(prev);
      if (ocultarAhora) next.add(herramientaId);
      else next.delete(herramientaId);
      return next;
    });
  }

  async function cargarMiembros(supabase: ReturnType<typeof createClient>, projectId: string, departamentoActual: string) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, cargo, avatar_url")
      .eq("departamento", departamentoActual);

    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roles } = ids.length > 0
      ? await supabase.from("user_roles").select("user_id, cargo").in("user_id", ids)
      : { data: [] as { user_id: string; cargo: string }[] };

    const lista: Miembro[] = (profiles ?? []).map((p) => ({
      user_id: p.id,
      full_name: p.full_name,
      cargo: p.cargo,
      avatar_url: p.avatar_url,
      cargosCompartidos: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.cargo),
    }));

    setMiembros(lista);
  }

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) {
        router.push("/proyectos");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("departamento, cargo")
        .eq("id", user.id)
        .single();

      if (!profile?.departamento) {
        router.push("/proyectos");
        return;
      }

      const departamentoActual = profile.departamento;
      const jerarquia = JERARQUIA_POR_DEPARTAMENTO[departamentoActual] ?? [];
      const esJefe = profile.cargo === jerarquia[0];

      if (!esJefe) {
        router.push("/proyectos");
        return;
      }

      setDepartamento(departamentoActual);
      setProjectId(projectId);
      await Promise.all([
        cargarMiembros(supabase, projectId, departamentoActual),
        cargarCargosCustom(supabase, projectId, departamentoActual),
        cargarVisibilidad(supabase, projectId, departamentoActual),
      ]);
      setAuthorized(true);
      setLoading(false);
    })();
  }, [router]);

  async function cambiarCargo(userId: string, nuevoCargo: string) {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ cargo: nuevoCargo }).eq("id", userId);
    if (error) {
      alert(t("errChangeRole", { msg: error.message }));
      return;
    }
    setMiembros((prev) => prev.map((m) => (m.user_id === userId ? { ...m, cargo: nuevoCargo } : m)));
  }

  async function agregarCargoCompartido(userId: string) {
    const cargo = cargoCompartidoNuevo[userId];
    if (!cargo) return;
    const supabase = createClient();
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, cargo });
    if (error) {
      alert(t("errAddSharedRole", { msg: error.message }));
      return;
    }
    setMiembros((prev) =>
      prev.map((m) => (m.user_id === userId ? { ...m, cargosCompartidos: [...m.cargosCompartidos, cargo].sort() } : m))
    );
    setCargoCompartidoNuevo((prev) => ({ ...prev, [userId]: "" }));
  }

  async function quitarCargoCompartido(userId: string, cargo: string) {
    const supabase = createClient();
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("cargo", cargo);
    if (error) {
      alert(t("errRemoveSharedRole", { msg: error.message }));
      return;
    }
    setMiembros((prev) =>
      prev.map((m) => (m.user_id === userId ? { ...m, cargosCompartidos: m.cargosCompartidos.filter((c) => c !== cargo) } : m))
    );
  }

  if (loading) {
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`}>
        <div className="soon-box" style={{ margin: "24px 30px" }}>
          <span className="hex"></span>
          <h4>{t("loading")}</h4>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`}>
        <div className="soon-box" style={{ margin: "24px 30px" }}>
          <span className="hex"></span>
          <h4>{t("accessDeniedTitle")}</h4>
          <p>{t("accessDeniedDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
      <header className="cp-topbar">
        <Link href="/proyectos" className="cp-logo"><img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" /></Link>
        <span className="cp-proj">{t("controlOf", { dept: departamento })}</span>
        <div className="cp-spacer"></div>
        <Link href="/proyectos" className="cp-menu-btn" style={{ textDecoration: "none" }}>
          <span className="hex"></span> {t("backToProjects")}
        </Link>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div style={{ padding: "30px", maxWidth: "1000px", margin: "0 auto" }}>
        <h2 style={{ marginBottom: "6px" }}>{t("controlOf", { dept: departamento })}</h2>
        <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "20px" }}>{t("manageDesc")}</p>

        <div style={{ background: "var(--hl1)", padding: "16px", borderRadius: "6px", border: "1px solid var(--line)" }}>
          <h3 style={{ marginBottom: "12px" }}>👥 {t("membersTitle", { n: miembros.length })}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {miembros.length === 0 ? (
              <span style={{ fontSize: "13px", color: "var(--muted)" }}>{t("noMembers")}</span>
            ) : (
              miembros.map((m) => (
                <div key={m.user_id} style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", background: "var(--bg)", borderRadius: "4px", border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        background: "var(--hl3)",
                        border: "1px solid var(--line)",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt={m.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span className="hex" style={{ width: "14px", height: "12px", background: "var(--lime)" }}></span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "500" }}>{m.full_name}</div>
                    </div>
                    <select
                      value={m.cargo ?? ""}
                      onChange={(e) => cambiarCargo(m.user_id, e.target.value)}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--text)", borderRadius: "4px", fontSize: "12px" }}
                    >
                      <option value="">{t("noRole")}</option>
                      {jerarquia.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ paddingLeft: "52px" }}>
                    <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>
                      {t("sharedRoles")}
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                      {m.cargosCompartidos.length === 0 ? (
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>{t("none")}</span>
                      ) : (
                        m.cargosCompartidos.map((c) => (
                          <div key={c} style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--hl3)", padding: "5px 9px", borderRadius: "4px", border: "1px solid var(--line)", fontSize: "12px" }}>
                            <span>{c}</span>
                            <button type="button" onClick={() => quitarCargoCompartido(m.user_id, c)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pink)" }}>✕</button>
                          </div>
                        ))
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <select
                        value={cargoCompartidoNuevo[m.user_id] ?? ""}
                        onChange={(e) => setCargoCompartidoNuevo((prev) => ({ ...prev, [m.user_id]: e.target.value }))}
                        style={{ padding: "8px 10px", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--text)", borderRadius: "4px", fontSize: "12px" }}
                      >
                        <option value="">{t("addSharedRolePh")}</option>
                        {jerarquia
                          .filter((c) => c !== m.cargo && !m.cargosCompartidos.includes(c))
                          .map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                      </select>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: "12px" }}
                        disabled={!cargoCompartidoNuevo[m.user_id]}
                        onClick={() => agregarCargoCompartido(m.user_id)}
                      >
                        {t("add")}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ marginTop: "20px", padding: "16px", background: "var(--hl1)", borderRadius: "6px", border: "1px solid var(--line)" }}>
          <h3 style={{ marginBottom: "12px" }}>{t("rolesTitle")}</h3>
          <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "12px" }}>{t("rolesDesc")}</p>
          <form onSubmit={crearCargo} style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              value={cargoNuevoInput}
              onChange={(e) => setCargoNuevoInput(e.target.value)}
              placeholder={t("newRolePh")}
              style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--text)", borderRadius: "4px", fontSize: "12px" }}
            />
            <button type="submit" className="btn" style={{ fontSize: "12px" }} disabled={!cargoNuevoInput.trim()}>
              {t("createRole")}
            </button>
          </form>
          {cargoNuevoMsg && <p className="amsg err" style={{ fontSize: "12px", marginTop: "8px" }}>{cargoNuevoMsg}</p>}
        </div>

        <div style={{ marginTop: "20px", padding: "16px", background: "var(--hl1)", borderRadius: "6px", border: "1px solid var(--line)" }}>
          <h3 style={{ marginBottom: "12px" }}>🛠 {t("toolsTitle")}</h3>
          <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "12px" }}>{t("toolsDesc")}</p>
          <ListaHerramientasDept
            departamento={departamento}
            ocultas={herramientasOcultas}
            togglingTool={togglingTool}
            onToggle={toggleHerramienta}
            nombreDe={nombreDe}
            t={t}
          />
        </div>

        <div style={{ marginTop: "20px", padding: "16px", background: "var(--hl1)", borderRadius: "6px", border: "1px solid var(--line)" }}>
          <h3 style={{ marginBottom: "12px" }}>{t("accessTitle")}</h3>
          <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "12px" }}>{t("accessDesc")}</p>
          <GestionAccesosPanel departamento={departamento} scope="departamento" />
        </div>
      </div>
    </div>
  );
}

function ListaHerramientasDept({
  departamento,
  ocultas,
  togglingTool,
  onToggle,
  nombreDe,
  t,
}: {
  departamento: string;
  ocultas: Set<string>;
  togglingTool: string | null;
  onToggle: (id: string, ocultarAhora: boolean) => void;
  nombreDe: (h: Herramienta) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  const lista: HerramientaDept[] = [
    ...deptTools(departamento).map((h) => ({ h, cargo: null })),
    ...cargoGroups(departamento).flatMap((g) => g.tools.map((h) => ({ h, cargo: g.cargo }))),
  ];

  if (lista.length === 0) {
    return <span style={{ fontSize: "13px", color: "var(--muted)" }}>{t("noTools")}</span>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {lista.map(({ h, cargo }) => {
        const oculta = ocultas.has(h.id);
        return (
          <div
            key={`${cargo ?? "dept"}-${h.id}`}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", background: "var(--bg)", borderRadius: "4px", border: "1px solid var(--line)", opacity: oculta ? 0.55 : 1 }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: "13px" }}>{nombreDe(h)}</span>
              {cargo && <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "8px" }}>{cargo}</span>}
            </div>
            <button
              type="button"
              className="btn"
              style={{ fontSize: "12px" }}
              disabled={togglingTool === h.id}
              onClick={() => onToggle(h.id, !oculta)}
            >
              {oculta ? t("restoreTool") : t("hideTool")}
            </button>
          </div>
        );
      })}
    </div>
  );
}
