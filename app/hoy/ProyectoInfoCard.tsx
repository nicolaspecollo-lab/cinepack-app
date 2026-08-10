"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type Creditos = { nombre: string; escrito_por: string[]; dirigido_por: string[]; producido_por: string[] };

// Tarjeta de info del proyecto (título + créditos): va primero en Pulso,
// antes de CicloTimeline — por eso vive aparte de ProyectoPulsoPanel, que
// se renderiza después del calendario.
export default function ProyectoInfoCard() {
  const t = useTranslations("pulso");
  const [creditos, setCreditos] = useState<Creditos | null>(null);

  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("proyectos")
        .select("nombre, escrito_por, dirigido_por, producido_por")
        .eq("id", projectId)
        .single();
      if (data) {
        setCreditos({
          nombre: data.nombre,
          escrito_por: (data.escrito_por as string[]) ?? [],
          dirigido_por: (data.dirigido_por as string[]) ?? [],
          producido_por: (data.producido_por as string[]) ?? [],
        });
      }
    })();
  }, []);

  if (!creditos || (creditos.escrito_por.length === 0 && creditos.dirigido_por.length === 0 && creditos.producido_por.length === 0)) {
    return null;
  }

  return (
    <div className="tcard pulso-card cp-creditos-card cp-optc">
      <h4><span className="hex"></span>{creditos.nombre}</h4>
      <dl className="cp-creditos-list">
        {creditos.dirigido_por.length > 0 && (
          <>
            <dt>{t("directedBy")}</dt>
            <dd>{creditos.dirigido_por.join(", ")}</dd>
          </>
        )}
        {creditos.escrito_por.length > 0 && (
          <>
            <dt>{t("writtenBy")}</dt>
            <dd>{creditos.escrito_por.join(", ")}</dd>
          </>
        )}
        {creditos.producido_por.length > 0 && (
          <>
            <dt>{t("producedBy")}</dt>
            <dd>{creditos.producido_por.join(", ")}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
