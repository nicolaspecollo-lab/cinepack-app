"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useEtiquetasMoodboardFoto } from "./useEtiquetasMoodboardFoto";
import type { FilaReferencia } from "./useMoodboardFotoFilas";

type Props = {
  filas: FilaReferencia[];
  urls: Record<string, string>;
  fullName: string;
  onElegir: (id: string) => Promise<unknown>;
  onComentar: (id: string, texto: string) => Promise<unknown>;
  onCerrar: () => void;
  // LIBRE: quien solo mira (Departamentos) puede comparar y comentar, pero no elegir.
  editable?: boolean;
  // LIBRE: false cuando se comparan referencias de sitios distintos (comparación libre).
  mismoSitio?: boolean;
};

export default function MoodboardFotoComparar({
  filas,
  urls,
  fullName,
  onElegir,
  onComentar,
  onCerrar,
  editable = true, // LIBRE
  mismoSitio = true, // LIBRE
}: Props) {
  const t = useTranslations("moodboardFoto");
  const { estados, categorias, niveles } = useEtiquetasMoodboardFoto();
  const [ocupado, setOcupado] = useState(false);
  // Un borrador de comentario por tarjeta, indexado por el id de la fila
  const [textos, setTextos] = useState<Record<string, string>>({});

  if (filas.length === 0) return null;
  const sitio = filas[0].datos;

  async function elegir(id: string) {
    setOcupado(true);
    await onElegir(id);
    setOcupado(false);
  }

  async function enviarComentario(id: string) {
    const texto = (textos[id] ?? "").trim();
    if (!texto) return;
    await onComentar(id, texto);
    setTextos((prev) => ({ ...prev, [id]: "" }));
  }

  return (
    <div className="dsr-overlay" onClick={onCerrar}>
      <div className="dsr-panel" onClick={(e) => e.stopPropagation()}>
        <div className="dsr-top">
          <div className="dsr-eyebrow"><span className="hex" />{t("compareTitle")}</div>
          <button type="button" className="dsr-close" onClick={onCerrar} aria-label={t("close")}>✕</button>
        </div>

        <div className="dsr-head">
          <div>
            {/* LIBRE: el sitio solo tiene sentido si todas compiten por el mismo */}
            {mismoSitio ? (
              <>
                <div className="dsr-tipo">{niveles[sitio.nivel]} · {categorias[sitio.categoria]}</div>
                {sitio.destino && <div className="dsr-titulo">{sitio.destino}</div>}
              </>
            ) : (
              <div className="dsr-titulo">{t("compareFreeHeading")}</div>
            )}
          </div>
        </div>

        <div className="dsr-body">
          <p className="amsg">{mismoSitio ? t("compareNote") : t("compareFreeNote")}</p>
          <div className="gdes-grid">
            {filas.map((f) => {
              const d = f.datos;
              const url = urls[d.ruta];
              const comentarios = d.comentarios;
              return (
                <div key={f.id} className="gdes-card">
                  <div className={`hp-gimg${url ? "" : " hp-gimg-empty"}`}>
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={d.titulo} />
                    ) : (
                      <span className="hex"></span>
                    )}
                  </div>
                  <div className="gdes-head">
                    <span className="gdes-hex" />
                    <span className="gdes-esc">{d.titulo}</span>
                    <span className="gdes-tag">{estados[d.estado]}</span>
                  </div>
                  {d.descripcion && <p className="gdes-resumen">{d.descripcion}</p>}
                  {d.queTomar && <p className="gdes-resumen"><b>{t("fldTake")}:</b> {d.queTomar}</p>}
                  {d.fuente && (
                    <div className="gdes-meta"><span>{t("fldSource")}: {d.fuente}</span></div>
                  )}

                  <div className="cq-thread">
                    {comentarios.length === 0 ? (
                      <p className="gdes-resumen">{t("noComments")}</p>
                    ) : (
                      comentarios.map((c, i) => (
                        <div
                          key={i}
                          className={`cq-bubble${c.usuario === fullName ? " cq-bubble-me" : ""}`}
                        >
                          <div className="cq-bubble-head">
                            <b>{c.usuario}</b> · {new Date(c.fecha).toLocaleString()}
                          </div>
                          {c.texto}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="cq-reply-row">
                    <input
                      className="cq-reply-input"
                      value={textos[f.id] ?? ""}
                      placeholder={t("commentPlaceholder")}
                      onChange={(e) => setTextos((prev) => ({ ...prev, [f.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") enviarComentario(f.id);
                      }}
                    />
                    <button type="button" className="cp-btn" onClick={() => enviarComentario(f.id)}>
                      {t("commentSend")}
                    </button>
                  </div>

                  {/* LIBRE: elegir principal solo si se puede editar y compiten por el mismo sitio */}
                  {editable && mismoSitio && (
                    <button type="button" className="cp-btn cp-btn-acc" disabled={ocupado} onClick={() => elegir(f.id)}>
                      {t("chooseMain")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="dsr-foot">
          <button type="button" className="cp-btn" onClick={onCerrar}>{t("cancel")}</button>
        </div>
      </div>
    </div>
  );
}