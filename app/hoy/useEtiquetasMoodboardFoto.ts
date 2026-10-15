import { useTranslations } from "next-intl";
import type { Categoria, Estado, Nivel } from "./moodboardFotoFilas";

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

  const niveles: Record<Nivel, string> = {
    general: t("levelGeneral"),
    secuencia: t("levelSequence"),
    escena: t("levelScene"),
  };

  return { estados, categorias, niveles };
}