"use client";

import { useTranslations } from "next-intl";
import type { Categoria, Estado } from "./moodboardFotoFilas";

// Textos traducidos de estados y categorías, para reutilizar en galería, ficha y filtros.
export function useEtiquetasMoodboardFoto() {
  const t = useTranslations("moodboardFoto");
  const estados: Record<Estado, string> = {
    borrador: t("stateDraft"),
    pendiente: t("statePending"),
    aprobada: t("stateApproved"),
    descartada: t("stateDiscarded"),
  };
  const categorias: Record<Categoria, string> = {
    iluminacion: t("catLighting"),
    color: t("catColor"),
    encuadre: t("catFraming"),
    composicion: t("catComposition"),
  };
  return { estados, categorias };
}