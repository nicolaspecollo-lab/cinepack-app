"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import BarChart from "./BarChart";

// En vez de geolocalizar por IP (el login es 100% client-side, no hay punto
// del servidor que vea esa request), se usa el lugar de producción que cada
// persona completa en su perfil — más confiable y más relevante para el
// negocio que la ubicación de conexión.
export default function RegionUsoCard() {
  const t = useTranslations("charts");
  const [datos, setDatos] = useState<{ label: string; value: number }[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("profiles").select("lugar_produccion");
      if (error) throw error;
      const conteo: Record<string, number> = {};
      (data ?? []).forEach((p) => {
        const lugar = p.lugar_produccion?.trim();
        if (!lugar) return;
        conteo[lugar] = (conteo[lugar] ?? 0) + 1;
      });
      setDatos(
        Object.entries(conteo)
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)
      );
    })().catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="cp-chart-card">
      <h4><span className="hex"></span>{t("regionTitle")}</h4>
      {err && <div className="cp-admin-err">{err}</div>}
      {!err && datos === null && <div className="cp-admin-empty">{t("loading")}</div>}
      {!err && datos?.length === 0 && (
        <div className="cp-admin-empty">{t("notEnoughDataRegion")}</div>
      )}
      {!err && datos && datos.length > 0 && <BarChart data={datos} color="var(--amber)" />}
    </div>
  );
}
