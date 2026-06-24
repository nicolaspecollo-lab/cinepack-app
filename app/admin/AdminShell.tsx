"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "../useTheme";
import ThemeToggle from "../components/ThemeToggle";
import "../cp-theme.css";
import "./admin.css";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/proyectos", label: "Proyectos" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/actividad", label: "Actividad" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/flags", label: "Feature flags" },
  { href: "/admin/soporte", label: "Soporte" },
  { href: "/admin/gestion", label: "Gestión" },
];

const BIBLIA_URL = "https://cinepack.es/biblia/";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
      <header className="cp-topbar">
        <Link href="/proyectos" className="cp-logo">
          <img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" />
        </Link>
        <span className="cp-proj">Panel de administrador</span>
        <div className="cp-spacer"></div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <Link href="/proyectos" className="cp-menu-btn" style={{ textDecoration: "none" }}>
          <span className="hex"></span> Salir del admin
        </Link>
      </header>

      <nav className="cp-admin-nav">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`cp-admin-tab ${pathname === t.href ? "active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
        <a href={BIBLIA_URL} target="_blank" rel="noreferrer" className="cp-admin-tab cp-admin-tab-biblia">
          <span className="hex"></span> Biblia de Producto ↗
        </a>
      </nav>

      <main className="cp-admin-main">
        <div className="hexbg"></div>
        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      </main>
    </div>
  );
}
