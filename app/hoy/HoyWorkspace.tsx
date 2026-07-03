"use client";

import { useEffect, useState } from "react";
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
      <DepartmentDashboard nombre={effectiveDept} accent={accent} fullName={fullName} cargo={effectiveCargo} avatarUrl={avatarUrl} isAdmin={isAdmin} />
    </WorkspaceShell>
  );
}
