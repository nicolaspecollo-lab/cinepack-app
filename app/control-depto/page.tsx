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
};

export default function ControlDeptPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [departamento, setDepartamento] = useState("");
  const [miembros, setMiembros] = useState<Miembro[]>([]);

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

      const { data: members } = await supabase
        .from("project_members")
        .select("user_id, profiles(full_name, cargo, avatar_url)")
        .eq("project_id", projectId);

      const lista = (members ?? [])
        .map((m) => {
          const p = m.profiles as unknown as { full_name: string; cargo: string | null; avatar_url: string | null } | null;
          if (!p) return null;
          return { user_id: m.user_id as string, full_name: p.full_name, cargo: p.cargo, avatar_url: p.avatar_url };
        })
        .filter((m): m is Miembro => m !== null);

      setMiembros(lista);
      setAuthorized(true);
      setLoading(false);
    })();
  }, [router]);

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
                <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", background: "var(--bg)", borderRadius: "4px", border: "1px solid var(--line)" }}>
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
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>{m.cargo ?? "Sin cargo"}</div>
                  </div>
                  <button className="btn" style={{ fontSize: "12px" }}>Editar</button>
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
