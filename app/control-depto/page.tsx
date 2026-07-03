"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { JERARQUIA_POR_DEPARTAMENTO } from "../constants";
import { useTheme } from "../useTheme";
import ThemeToggle from "../components/ThemeToggle";
import ControlDeptoPanel from "../hoy/ControlDeptoPanel";
import "../cp-theme.css";

export default function ControlDeptPage() {
  const router = useRouter();
  const t = useTranslations("controlDepto");
  const { theme, toggleTheme } = useTheme();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [departamento, setDepartamento] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) { router.push("/proyectos"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("departamento, cargo, is_admin, app_role")
        .eq("id", user.id)
        .single();

      if (!profile?.departamento) { router.push("/proyectos"); return; }

      const jerarquia = JERARQUIA_POR_DEPARTAMENTO[profile.departamento] ?? [];
      const esJefe = profile.cargo === jerarquia[0];
      const esSuperadmin = !!profile.is_admin || profile.app_role === "super_admin";

      if (!esJefe && !esSuperadmin) { router.push("/proyectos"); return; }

      setDepartamento(profile.departamento);
      setAuthorized(true);
      setLoading(false);
    })();
  }, [router]);

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
        <ControlDeptoPanel departamento={departamento} />
      </div>
    </div>
  );
}
