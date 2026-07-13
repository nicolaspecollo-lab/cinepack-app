"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "../useTheme";
import ThemeToggle from "../components/ThemeToggle";
import "../cp-theme.css";
import "../hoy/dashboard.css";
import "./admin.css";

const BIBLIA_URL = "https://cinepack.es/biblia/";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("adminShell");
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const TABS = [
    { href: "/admin", label: t("dashboard") },
    { href: "/admin/proyectos", label: t("projects") },
    { href: "/admin/usuarios", label: t("users") },
    { href: "/admin/actividad", label: t("activity") },
    { href: "/admin/feedback", label: t("feedback") },
    { href: "/admin/flags", label: t("featureFlags") },
    { href: "/admin/soporte", label: t("support") },
    { href: "/admin/gestion", label: t("management") },
  ];

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
      <header className="cp-topbar">
        <Link href="/proyectos" className="cp-logo">
          <img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" />
        </Link>
        <span className="cp-proj">{t("adminPanel")}</span>
        <div className="cp-spacer"></div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <Link href="/proyectos" className="cp-menu-btn" style={{ textDecoration: "none" }}>
          <span className="hex"></span> {t("exitAdmin")}
        </Link>
      </header>

      <nav className="cp-admin-nav">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`cp-admin-tab ${pathname === tab.href ? "active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
        <a href={BIBLIA_URL} target="_blank" rel="noreferrer" className="cp-admin-tab cp-admin-tab-biblia">
          <span className="hex"></span> {t("productBible")} ↗
        </a>
      </nav>

      <main className="cp-admin-main">
        <div className="hexbg"></div>
        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      </main>
    </div>
  );
}
