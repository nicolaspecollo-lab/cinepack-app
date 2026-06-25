"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { JERARQUIA_POR_DEPARTAMENTO } from "../constants";
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

export default function ControlDeptPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [departamento, setDepartamento] = useState("");
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargoCompartidoNuevo, setCargoCompartidoNuevo] = useState<Record<string, string>>({});

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
      await cargarMiembros(supabase, projectId, departamentoActual);
      setAuthorized(true);
      setLoading(false);
    })();
  }, [router]);

  async function cambiarCargo(userId: string, nuevoCargo: string) {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ cargo: nuevoCargo }).eq("id", userId);
    if (error) {
      alert(`No se pudo cambiar el cargo: ${error.message}`);
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
      alert(`No se pudo agregar el cargo compartido: ${error.message}`);
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
      alert(`No se pudo quitar el cargo compartido: ${error.message}`);
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
          <h4>Cargando…</h4>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`}>
        <div className="soon-box" style={{ margin: "24px 30px" }}>
          <span className="hex"></span>
          <h4>Acceso denegado</h4>
          <p>Solo los Jefes de Departamento pueden acceder aquí.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
      <header className="cp-topbar">
        <Link href="/proyectos" className="cp-logo"><img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" /></Link>
        <span className="cp-proj">Control de {departamento}</span>
        <div className="cp-spacer"></div>
        <Link href="/proyectos" className="cp-menu-btn" style={{ textDecoration: "none" }}>
          <span className="hex"></span> Volver a proyectos
        </Link>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div style={{ padding: "30px", maxWidth: "1000px", margin: "0 auto" }}>
        <h2 style={{ marginBottom: "6px" }}>Control de {departamento}</h2>
        <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "20px" }}>
          Gestiona los miembros y herramientas de tu departamento.
        </p>

        <div style={{ background: "var(--hl1)", padding: "16px", borderRadius: "6px", border: "1px solid var(--line)" }}>
          <h3 style={{ marginBottom: "12px" }}>👥 Miembros del departamento ({miembros.length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {miembros.length === 0 ? (
              <span style={{ fontSize: "13px", color: "var(--muted)" }}>Sin miembros en tu departamento</span>
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
                      <option value="">Sin cargo</option>
                      {(JERARQUIA_POR_DEPARTAMENTO[departamento] ?? []).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ paddingLeft: "52px" }}>
                    <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>
                      Cargos compartidos
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                      {m.cargosCompartidos.length === 0 ? (
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>Ninguno</span>
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
                        <option value="">Agregar cargo compartido…</option>
                        {(JERARQUIA_POR_DEPARTAMENTO[departamento] ?? [])
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
                        + Agregar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ marginTop: "20px", padding: "16px", background: "var(--hl1)", borderRadius: "6px", border: "1px solid var(--line)" }}>
          <h3 style={{ marginBottom: "12px" }}>🛠 Herramientas del departamento</h3>
          <p style={{ fontSize: "13px", color: "var(--muted)" }}>
            La gestión de herramientas por cargo se realiza desde el mapa de herramientas en "Generales".
          </p>
        </div>
      </div>
    </div>
  );
}
