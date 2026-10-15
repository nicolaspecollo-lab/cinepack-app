"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// URLs temporales (1 h) de las imágenes guardadas en Storage, indexadas por ruta.
// Cada ruta se pide una sola vez.
export function useUrlsImagenes(rutas: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const pedidas = useRef<Set<string>>(new Set());

  useEffect(() => {
    const nuevas = rutas.filter((r) => !pedidas.current.has(r));
    if (nuevas.length === 0) return;
    nuevas.forEach((r) => pedidas.current.add(r));
    createClient()
      .storage.from("documentos")
      .createSignedUrls(nuevas, 3600)
      .then(({ data }) => {
        const mapa: Record<string, string> = {};
        (data ?? []).forEach((item) => {
          if (item.signedUrl && item.path) mapa[item.path] = item.signedUrl;
        });
        setUrls((prev) => ({ ...prev, ...mapa }));
      });
  }, [rutas]);

  return urls;
}