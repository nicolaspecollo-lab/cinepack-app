"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type Fila = {
  id: string;
  datos: Record<string, string>;
  orden: number;
};

function FotoCandidato({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let activo = true;
    const supabase = createClient();
    supabase.storage.from("documentos").createSignedUrl(path, 3600).then(({ data }) => {
      if (activo) setUrl(data?.signedUrl ?? null);
    });
    return () => { activo = false; };
  }, [path]);
  return (
    <div className="hp-gimg">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      ) : (
        <span className="hp-gimg-empty"><span className="hex"></span></span>
      )}
    </div>
  );
}

export default function CandidatosPorPersonajePanel({ departamento }: { departamento: string }) {
  const t = useTranslations("candidatos");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [loading, setLoading] = useState(true);
  const [personaje, setPersonaje] = useState<string>("todos");

  useEffect(() => {
    async function load() {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) { setLoading(false); return; }
      const supabase = createClient();
      const { data } = await supabase
        .from("herramienta_filas")
        .select("id, datos, orden")
        .eq("project_id", projectId)
        .eq("departamento", departamento)
        .eq("herramienta_id", "cast-candidatos")
        .order("orden", { ascending: true });
      setFilas((data ?? []).filter((r) => r.orden !== -1) as Fila[]);
      setLoading(false);
    }
    load();
  }, [departamento]);

  if (loading) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>{t("loading")}</h4>
      </div>
    );
  }

  const personajes = Array.from(new Set(filas.map((f) => f.datos.personaje?.trim()).filter(Boolean))) as string[];
  const visibles = filas.filter((f) => personaje === "todos" || f.datos.personaje === personaje);

  if (filas.length === 0) {
    return (
      <div className="soon-box" style={{ marginTop: 0 }}>
        <span className="hex"></span>
        <h4>{t("noCandidatesTitle")}</h4>
        <p>{t("noCandidatesDesc")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="dsubtabs" style={{ padding: "0 30px" }}>
        <button className={`dsubtab ${personaje === "todos" ? "active" : ""}`} onClick={() => setPersonaje("todos")}>
          {t("allCharacters")}
        </button>
        {personajes.map((p) => (
          <button key={p} className={`dsubtab ${personaje === p ? "active" : ""}`} onClick={() => setPersonaje(p)}>
            {p}
          </button>
        ))}
      </div>

      <div className="hp-galeria">
        {visibles.map((f) => (
          <div className="hp-gcard" key={f.id}>
            <FotoCandidato path={f.datos.foto ?? ""} />
            <label className="hp-gfield">
              <span>{t("character")}</span>
              <input defaultValue={f.datos.personaje ?? ""} readOnly />
            </label>
            <label className="hp-gfield">
              <span>{t("candidate")}</span>
              <input defaultValue={f.datos.candidato ?? ""} readOnly />
            </label>
            <label className="hp-gfield">
              <span>{t("agency")}</span>
              <input defaultValue={f.datos.agencia ?? ""} readOnly />
            </label>
            <label className="hp-gfield">
              <span>{t("phase")}</span>
              <input defaultValue={f.datos.fase ?? ""} readOnly />
            </label>
            {f.datos.reel && (
              <a className="hp-link-ext" href={f.datos.reel} target="_blank" rel="noopener noreferrer">{t("viewReel")}</a>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
