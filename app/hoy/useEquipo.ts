"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { JERARQUIA_POR_DEPARTAMENTO } from "../constants";

export type Miembro = {
  user_id: string;
  full_name: string;
  cargo: string | null;
  avatar_url: string | null;
};

export function useEquipo(departamento: string) {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
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

      const lista = (data ?? [])
        .map((row) => {
          const p = row.profiles as unknown as {
            full_name: string;
            departamento: string;
            cargo: string | null;
            avatar_url: string | null;
          } | null;
          if (!p || p.departamento !== departamento) return null;
          return {
            user_id: row.user_id as string,
            full_name: p.full_name,
            cargo: p.cargo,
            avatar_url: p.avatar_url,
          };
        })
        .filter((m): m is Miembro => m !== null);

      const orden = JERARQUIA_POR_DEPARTAMENTO[departamento] ?? [];
      lista.sort((a, b) => {
        const ia = a.cargo ? orden.indexOf(a.cargo) : -1;
        const ib = b.cargo ? orden.indexOf(b.cargo) : -1;
        const pa = ia === -1 ? orden.length : ia;
        const pb = ib === -1 ? orden.length : ib;
        if (pa !== pb) return pa - pb;
        return a.full_name.localeCompare(b.full_name);
      });

      setMiembros(lista);
      setLoading(false);
    })();
  }, [departamento]);

  return { miembros, loading };
}
