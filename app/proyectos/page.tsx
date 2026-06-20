"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "../useTheme";
import ThemeToggle from "../components/ThemeToggle";
import ThemeChooser from "../components/ThemeChooser";
import "../cp-theme.css";

type Proyecto = { id: string; nombre: string };

export default function ProyectosPage() {
  const router = useRouter();
  const { theme, setTheme, toggleTheme } = useTheme();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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

      setIsAdmin(!!profile?.is_admin);

      const { data } = await supabase
        .from("project_members")
        .select("proyectos(id, nombre)")
        .eq("user_id", user.id);

      const lista = (data ?? [])
        .map((row) => row.proyectos as unknown as Proyecto)
        .filter(Boolean);

      setProyectos(lista);
      setLoading(false);
    })();
  }, [router]);

  function elegir(p: Proyecto) {
    localStorage.setItem("cinepack-proyecto", p.nombre);
    localStorage.setItem("cinepack-proyecto-id", p.id);
    router.push("/hoy");
  }

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
      <ThemeChooser onChoose={setTheme} />
      <header className="cp-topbar">
        <div className="cp-logo"><img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" /></div>
        <span className="cp-proj">Selecciona un proyecto</span>
        <div className="cp-spacer"></div>
        {isAdmin && (
          <Link href="/proyectos/nuevo" className="cp-menu-btn" style={{ textDecoration: "none" }}>
            <span className="hex"></span> Crear proyecto
          </Link>
        )}
        <Link href="/perfil" className="cp-menu-btn" style={{ textDecoration: "none" }}>
          <span className="hex"></span> Mi perfil
        </Link>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      {loading ? (
        <div className="soon-box" style={{ margin: "24px 30px" }}>
          <span className="hex"></span>
          <h4>Cargando proyectos…</h4>
        </div>
      ) : proyectos.length === 0 ? (
        <div className="soon-box" style={{ margin: "24px 30px" }}>
          <span className="hex"></span>
          <h4>Sin proyectos asignados</h4>
          <p>Todavía no formas parte de ningún proyecto. Contacta con soporte para que te asignen uno.</p>
        </div>
      ) : (
        <div className="cp-projects">
          {proyectos.map((p) => (
            <button key={p.id} className="cp-project-card" onClick={() => elegir(p)}>
              <span className="tag">Proyecto</span>
              <h3>{p.nombre}</h3>
              <p>Entrar a tu espacio de trabajo en {p.nombre}.</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
