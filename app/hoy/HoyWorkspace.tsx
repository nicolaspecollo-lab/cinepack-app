"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import WorkspaceShell from "../components/WorkspaceShell";
import DepartmentDashboard from "./DepartmentDashboard";
import { ACCENTS, DEPARTAMENTOS, JERARQUIA_POR_DEPARTAMENTO } from "../constants";

const STORAGE_KEY = "cinepack-dept-override";
const CARGO_STORAGE_KEY = "cinepack-cargo-override";

export default function HoyWorkspace({
  fullName,
  departamento,
  isAdmin,
  avatarUrl,
  cargo,
}: {
  fullName: string;
  departamento: string;
  isAdmin: boolean;
  avatarUrl?: string | null;
  cargo?: string | null;
}) {
  const [deptOverride, setDeptOverride] = useState<string | null>(null);
  const [cargoOverride, setCargoOverride] = useState<string | null>(null);
  const te = useTranslations("workspaceEstado");
  const locale = useLocale();

  // Estado de acceso al proyecto activo (impago / archivado). Para no-admin,
  // un proyecto suspendido o archivado bloquea la entrada; un aviso de impago
  // muestra un banner no bloqueante. El admin (soporte) entra siempre.
  const [acceso, setAcceso] = useState<"cargando" | "ok" | "bloqueado">("cargando");
  const [motivoBloqueo, setMotivoBloqueo] = useState<"suspendido" | "archivado" | null>(null);
  const [avisoFecha, setAvisoFecha] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const pid = typeof window !== "undefined" ? localStorage.getItem("cinepack-proyecto-id") : null;
      if (!pid) { if (vivo) setAcceso("ok"); return; }
      const supabase = createClient();
      const { data } = await supabase
        .from("proyectos")
        .select("suspendido_at, archivado_at, aviso_impago_at, aviso_bloqueo_fecha")
        .eq("id", pid)
        .single();
      if (!vivo) return;
      if (!data) { setAcceso("ok"); return; }
      if (!isAdmin && (data.suspendido_at || data.archivado_at)) {
        setMotivoBloqueo(data.suspendido_at ? "suspendido" : "archivado");
        setAcceso("bloqueado");
        return;
      }
      if (data.aviso_impago_at) setAvisoFecha(data.aviso_bloqueo_fecha ?? null);
      setAcceso("ok");
    })();
    return () => { vivo = false; };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const savedDept = localStorage.getItem(STORAGE_KEY);
    if (savedDept && DEPARTAMENTOS.includes(savedDept)) {
      setDeptOverride(savedDept);
      const savedCargo = localStorage.getItem(CARGO_STORAGE_KEY);
      if (savedCargo) setCargoOverride(savedCargo);
    }
  }, [isAdmin]);

  function handleDeptChange(dept: string) {
    // Reset cargo override whenever department changes
    localStorage.removeItem(CARGO_STORAGE_KEY);
    setCargoOverride(null);
    if (dept === departamento) {
      localStorage.removeItem(STORAGE_KEY);
      setDeptOverride(null);
    } else {
      localStorage.setItem(STORAGE_KEY, dept);
      setDeptOverride(dept);
    }
  }

  function handleCargoChange(c: string) {
    localStorage.setItem(CARGO_STORAGE_KEY, c);
    setCargoOverride(c);
  }

  const effectiveDept = isAdmin && deptOverride ? deptOverride : departamento;
  const accent = ACCENTS[effectiveDept] ?? "lime";
  const effectiveCargo = isAdmin && cargoOverride ? cargoOverride : cargo;
  const cargosForDept = JERARQUIA_POR_DEPARTAMENTO[effectiveDept] ?? [];

  if (acceso === "cargando") {
    return (
      <div className="cp-dash" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="soon-box"><span className="hex"></span><h4>{te("checking")}</h4></div>
      </div>
    );
  }

  if (acceso === "bloqueado") {
    return (
      <div className="cp-dash" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="soon-box" style={{ maxWidth: 460, textAlign: "center" }}>
          <span className="hex"></span>
          <h4>{motivoBloqueo === "archivado" ? te("archivedTitle") : te("suspendedTitle")}</h4>
          <p>{motivoBloqueo === "archivado" ? te("archivedDesc") : te("suspendedDesc")}</p>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>{te("contactSupport")}</p>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceShell
      fullName={fullName}
      departamento={effectiveDept}
      isAdmin={isAdmin}
      homeDept={departamento}
      onDeptChange={handleDeptChange}
      cargoOverride={cargoOverride}
      cargosDisponibles={isAdmin ? cargosForDept : []}
      onCargoChange={handleCargoChange}
      avatarUrl={avatarUrl}
    >
      {avisoFecha && (
        <div style={{
          background: "var(--hl3)", color: "var(--amber)", border: "1px solid var(--amber)",
          padding: "10px 14px", margin: "0 0 12px", fontSize: 13, fontWeight: 600,
        }}>
          ⚠ {te("warnBanner", { fecha: new Date(avisoFecha).toLocaleDateString(locale) })}
        </div>
      )}
      <DepartmentDashboard nombre={effectiveDept} accent={accent} fullName={fullName} cargo={effectiveCargo} avatarUrl={avatarUrl} isAdmin={isAdmin} />
    </WorkspaceShell>
  );
}
