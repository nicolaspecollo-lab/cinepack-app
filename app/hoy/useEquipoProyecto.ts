"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEPARTAMENTOS, JERARQUIA_POR_DEPARTAMENTO } from "../constants";

export type MiembroProyecto = {
  user_id: string;
  full_name: string;
  cargo: string | null;
  avatar_url: string | null;
};

export type GrupoDepartamento = {
  departamento: string;
  miembros: MiembroProyecto[];
};

// Todo el equipo del proyecto (todos los departamentos), agrupado y
// ordenado — a diferencia de useEquipo() que filtra a UN solo departamento
// (lo sigue usando GestionAccesosPanel, sin tocar). Dentro de cada grupo,
// ordena por la jerarquía interna del departamento (cabeza primero).
export function useEquipoProyecto() {
  const [grupos, setGrupos] = useState<GrupoDepartamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const proyectoId = localStorage.getItem("cinepack-proyecto-id");
      if (!proyectoId) {
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from("project_members")
        .select("user_id, profiles(full_name, departamento, cargo, avatar_url)")
        .eq("project_id", proyectoId);

      const porDepto = new Map<string, MiembroProyecto[]>();
      for (const row of data ?? []) {
        const p = row.profiles as unknown as {
          full_name: string;
          departamento: string;
          cargo: string | null;
          avatar_url: string | null;
        } | null;
        if (!p) continue;
        const lista = porDepto.get(p.departamento) ?? [];
        lista.push({
          user_id: row.user_id as string,
          full_name: p.full_name,
          cargo: p.cargo,
          avatar_url: p.avatar_url,
        });
        porDepto.set(p.departamento, lista);
      }

      const resultado: GrupoDepartamento[] = DEPARTAMENTOS
        .filter((d) => porDepto.has(d))
        .map((departamento) => {
          const orden = JERARQUIA_POR_DEPARTAMENTO[departamento] ?? [];
          const miembros = [...(porDepto.get(departamento) ?? [])].sort((a, b) => {
            const ia = a.cargo ? orden.indexOf(a.cargo) : -1;
            const ib = b.cargo ? orden.indexOf(b.cargo) : -1;
            const pa = ia === -1 ? orden.length : ia;
            const pb = ib === -1 ? orden.length : ib;
            if (pa !== pb) return pa - pb;
            return a.full_name.localeCompare(b.full_name);
          });
          return { departamento, miembros };
        });

      setGrupos(resultado);
      setLoading(false);
    })();
  }, []);

  return { grupos, loading };
}
