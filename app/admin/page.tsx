"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "../useTheme";
import ThemeToggle from "../components/ThemeToggle";
import PanelEjecutivo from "./panel-ejecutivo";
import "../cp-theme.css";

export default function AdminPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

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
        .select("departamento")
        .eq("id", user.id)
        .single();

      if (profile?.departamento !== "Ejecutivo") {
        router.push("/proyectos");
        return;
      }

      setAuthorized(true);
      setLoading(false);
    })();
  }, [router]);

  if (loading || !authorized) {
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`}>
        <div className="soon-box" style={{ margin: "24px 30px" }}>
          <span className="hex"></span>
          <h4>Validando acceso…</h4>
        </div>
      </div>
    );
  }

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
      <header className="cp-topbar">
        <Link href="/proyectos" className="cp-logo"><img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" /></Link>
        <span className="cp-proj">Panel Ejecutivo</span>
        <div className="cp-spacer"></div>
        <Link href="/proyectos" className="cp-menu-btn" style={{ textDecoration: "none" }}>
          <span className="hex"></span> Volver a proyectos
        </Link>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <PanelEjecutivo />
      </div>
    </div>
  );
}
