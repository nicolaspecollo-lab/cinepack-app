"use client";

import { useEffect, useState } from "react";
import WorkspaceShell from "../components/WorkspaceShell";
import DepartmentDashboard from "./DepartmentDashboard";
import { ACCENTS, DEPARTAMENTOS } from "../constants";

const STORAGE_KEY = "cinepack-dept-override";

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

  useEffect(() => {
    if (!isAdmin) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DEPARTAMENTOS.includes(saved)) setDeptOverride(saved);
  }, [isAdmin]);

  function handleDeptChange(dept: string) {
    if (dept === departamento) {
      localStorage.removeItem(STORAGE_KEY);
      setDeptOverride(null);
    } else {
      localStorage.setItem(STORAGE_KEY, dept);
      setDeptOverride(dept);
    }
  }

  const effectiveDept = isAdmin && deptOverride ? deptOverride : departamento;
  const accent = ACCENTS[effectiveDept] ?? "lime";

  return (
    <WorkspaceShell
      fullName={fullName}
      departamento={effectiveDept}
      isAdmin={isAdmin}
      homeDept={departamento}
      onDeptChange={handleDeptChange}
      avatarUrl={avatarUrl}
    >
      <DepartmentDashboard nombre={effectiveDept} accent={accent} fullName={fullName} cargo={cargo} />
    </WorkspaceShell>
  );
}
