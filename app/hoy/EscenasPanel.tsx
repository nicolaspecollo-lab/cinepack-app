"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { HERRAMIENTA_POR_ID } from "../herramientas";
import { useNombreHerramienta } from "./HerramientasPanel";

type DialogoLinea = { personaje: string; parentetico?: string; texto: string };

type Propuesta = {
  departamento: string;
  herramienta_id: string;
  datos: Record<string, string>;
};

const CAMPOS_ESCENA = ["escena", "escenas", "secuencia"];

function tokensNumericos(s: string): string[] {
  return s.match(/\d+/g) ?? [];
}

function propuestaDeEscena(datos: Record<string, string>, numero: number): boolean {
  const refs = CAMPOS_ESCENA.map((k) => datos[k] ?? "").join(" ");
  return tokensNumericos(refs).includes(String(numero));
}

function resumenPropuesta(p: Propuesta): string {
  const h = HERRAMIENTA_POR_ID[p.herramienta_id];
  const cols = h?.columnas ?? [];
  const partes = cols
    .filter((c) => !CAMPOS_ESCENA.includes(c.key))
    .map((c) => (p.datos[c.key] ?? "").trim())
    .filter(Boolean);
  return partes.slice(0, 3).join(" · ");
}

type Escena = {
  id: string;
  numero: number;
  int_ext: string | null;
  lugar: string | null;
  dia_noche: string | null;
  encabezado: string;
  descripcion: string | null;
  personajes: string[];
  dialogo: DialogoLinea[];
  estado: string;
};

type Plano = {
  id: string;
  escena: string;
  plano: string;
  tipo: string | null;
  mov_camara: string | null;
  lente: string | null;
  descripcion: string;
  notas: string | null;
};

export default function EscenasPanel({ departamento }: { departamento: string }) {
  const t = useTranslations("escenas");
  const nombreDe = useNombreHerramienta();
  const [escenas, setEscenas] = useState<Escena[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [abierta, setAbierta] = useState<number | null>(null);

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const [{ data: esc }, { data: pl }, { data: prop }] = await Promise.all([
      supabase
        .from("escenas")
        .select("*")
        .eq("project_id", projectId)
        .order("orden", { ascending: true })
        .order("numero", { ascending: true }),
      supabase.from("planos").select("*").eq("project_id", projectId),
      supabase.from("herramienta_filas").select("departamento, herramienta_id, datos").eq("project_id", projectId),
    ]);
    setEscenas(esc ?? []);
    setPlanos(pl ?? []);
    setPropuestas((prop ?? []) as Propuesta[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="cons-text">{t("loading")}</p>;

  if (escenas.length === 0) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>{t("noScenesTitle")}</h4>
        <p>
          {t("noScenesDesc", { name: "Escena 3D", script: "Guion", dept: departamento })}
        </p>
      </div>
    );
  }

  const escenaAbierta = escenas.find((e) => e.numero === abierta);
  const planosAbierta = escenaAbierta ? planos.filter((p) => p.escena === String(escenaAbierta.numero)) : [];

  // Propuestas de todos los departamentos cuyas filas referencian esta escena.
  const propuestasAbierta = escenaAbierta
    ? propuestas.filter((p) => propuestaDeEscena(p.datos ?? {}, escenaAbierta.numero))
    : [];
  const propuestasPorDepto = propuestasAbierta.reduce<Record<string, Propuesta[]>>((acc, p) => {
    (acc[p.departamento] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="tools">
      <div className="tool">
        <div className="tool-head">
          <span className="hex"></span>
          <h3>{t("sceneIndex")}</h3>
          <div className="right">{t("scenesCount", { n: escenas.length })}</div>
        </div>
        <div className="twrap">
          <table className="t">
            <tbody>
              <tr>
                <th>{t("colScene")}</th>
                <th>{t("colHeading")}</th>
                <th>{t("colPlace")}</th>
                <th>{t("colChars")}</th>
                <th>{t("colStatus")}</th>
                <th></th>
              </tr>
              {escenas.map((e) => (
                <tr key={e.id} style={abierta === e.numero ? { background: "rgba(255,255,255,0.04)" } : {}}>
                  <td className="mono">
                    <b>{e.numero}</b>
                  </td>
                  <td>{e.encabezado}</td>
                  <td>{e.lugar ?? "—"}</td>
                  <td>{e.personajes?.length ? e.personajes.join(", ") : "—"}</td>
                  <td>
                    <span className={`pill ${e.estado === "confirmada" ? "p-ok" : "p-warn"}`}>
                      {e.estado === "confirmada" ? t("confirmed") : t("draft")}
                    </span>
                  </td>
                  <td>
                    <span
                      className="chip"
                      style={{ cursor: "pointer", borderColor: "var(--acc)", color: "var(--acc)" }}
                      onClick={() => setAbierta(abierta === e.numero ? null : e.numero)}
                    >
                      {abierta === e.numero ? t("close") : t("fullSheet")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {escenaAbierta && (
        <div className="tool" style={{ borderColor: "var(--acc)" }}>
          <div className="tool-head">
            <span className="hex"></span>
            <h3>
              {t("sceneSheet", { n: escenaAbierta.numero, heading: escenaAbierta.encabezado })}
            </h3>
            <span className="tag">
              {[escenaAbierta.int_ext, escenaAbierta.dia_noche].filter(Boolean).join(" · ") || "—"}
            </span>
          </div>
          {escenaAbierta.descripcion && <p className="tool-sub">{escenaAbierta.descripcion}</p>}
          <div className="grid2">
            <div className="mini">
              <h4>
                <span className="hex"></span>{t("characters")}
              </h4>
              <ul>
                {escenaAbierta.personajes?.length ? (
                  escenaAbierta.personajes.map((p) => (
                    <li key={p}>
                      <span>{p}</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>{t("noCharsAssigned")}</span>
                  </li>
                )}
              </ul>
            </div>
            <div className="mini">
              <h4>
                <span className="hex"></span>{t("techShots", { n: planosAbierta.length })}
              </h4>
              <ul>
                {planosAbierta.length ? (
                  planosAbierta.map((p) => (
                    <li key={p.id}>
                      <span>
                        {p.plano} · {p.tipo || "—"}
                        {p.mov_camara ? ` · ${p.mov_camara}` : ""}
                      </span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>{t("noTechBreakdown")}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="mini" style={{ marginTop: "12px" }}>
            <h4>
              <span className="hex"></span>{t("deptProposals", { n: propuestasAbierta.length })}
            </h4>
            {propuestasAbierta.length === 0 ? (
              <p style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
                {t("noProposalsYet", { n: escenaAbierta.numero })}
              </p>
            ) : (
              <ul>
                {Object.entries(propuestasPorDepto).map(([depto, lista]) => (
                  <li key={depto} style={{ display: "block" }}>
                    <span style={{ color: "var(--acc)", fontWeight: 700 }}>{depto}</span>
                    <ul style={{ margin: "4px 0 8px", paddingLeft: 0 }}>
                      {lista.map((p, i) => {
                        const h = HERRAMIENTA_POR_ID[p.herramienta_id];
                        const resumen = resumenPropuesta(p);
                        return (
                          <li key={i} style={{ display: "block", fontSize: "12px", color: "var(--muted)", padding: "2px 0" }}>
                            <b style={{ color: "var(--text)" }}>{h ? nombreDe(h) : p.herramienta_id}</b>
                            {resumen ? ` — ${resumen}` : ""}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {escenaAbierta.dialogo?.length > 0 && (
            <div className="mini" style={{ marginTop: "12px" }}>
              <h4>
                <span className="hex"></span>{t("dialogue")}
              </h4>
              <ul>
                {escenaAbierta.dialogo.map((d, i) => (
                  <li key={i}>
                    <span>
                      <b>{d.personaje}</b>
                      {d.parentetico ? ` (${d.parentetico})` : ""}: {d.texto}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="note">
        <b>{t("sharedView")}</b>{t("sharedDesc", { script: "Guion", techScript: "Guion Técnico", dept: departamento })}
      </div>
    </div>
  );
}
