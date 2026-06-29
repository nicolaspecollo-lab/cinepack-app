"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export type InboxItem = {
  id: string;
  tipo: "tarea" | "alerta";
  texto: string;
};

const SNOOZE_KEY = "cinepack-inbox-snooze";
const SNOOZE_MS = 60 * 60 * 1000;

function leerSnoozed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export default function InboxPanel({
  items,
  onCompletar,
  onDescartar,
  onIrAPulso,
}: {
  items: InboxItem[];
  onCompletar: (id: string) => void;
  onDescartar: (id: string) => void;
  onIrAPulso: () => void;
}) {
  const t = useTranslations("inbox");
  const [open, setOpen] = useState(false);
  const [snoozed, setSnoozed] = useState<Record<string, number>>({});
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSnoozed(leerSnoozed());
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // El trigger ya no vive en la barra: se abre desde el menú del shell
  // (Preferencias → Notificaciones) que dispara este evento.
  useEffect(() => {
    function onOpen() {
      setSnoozed(leerSnoozed());
      setOpen(true);
    }
    window.addEventListener("cp-inbox-open", onOpen);
    return () => window.removeEventListener("cp-inbox-open", onOpen);
  }, []);

  function snooze(id: string) {
    const next = { ...snoozed, [id]: Date.now() + SNOOZE_MS };
    setSnoozed(next);
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
  }

  const visibles = items.filter((i) => {
    const hasta = snoozed[i.id];
    return !hasta || hasta < Date.now();
  });

  if (!open) return null;

  return (
    <div className="cp-inbox" ref={ref}>
      <div className="cp-inbox-panel">
          <div className="cp-inbox-head">
            <span>{t("title")}</span>
            {visibles.length > 0 && (
              <button className="cp-inbox-go" onClick={() => { onIrAPulso(); setOpen(false); }}>
                {t("seeInPulse")}
              </button>
            )}
          </div>
          {visibles.length === 0 && <div className="cp-inbox-empty">{t("allCaughtUp")}</div>}
          {visibles.length > 0 && (
            <ul className="cp-inbox-list">
              {visibles.map((i) => (
                <li key={i.id}>
                  <span className={`cp-inbox-pill cp-inbox-${i.tipo}`}>{i.tipo === "tarea" ? t("task") : t("alert")}</span>
                  <span className="cp-inbox-texto">{i.texto}</span>
                  <span className="cp-inbox-actions">
                    <button title={t("snooze")} onClick={() => snooze(i.id)}>💤</button>
                    <button title={t("resolve")} onClick={() => (i.tipo === "tarea" ? onCompletar(i.id) : onDescartar(i.id))}>✓</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
}
