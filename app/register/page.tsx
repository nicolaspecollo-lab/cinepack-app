"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "../useTheme";
import ThemeToggle from "../components/ThemeToggle";
import "../cp-theme.css";

// El registro público está cerrado: esta ruta solo redirige.
// - Con ?token=<uuid> válido: reusa el flujo real de /invitacion/[token]
//   (que ya valida el email contra la invitación antes de crear la cuenta).
// - Sin token o con token inválido: vuelve a /login con el aviso de
//   registro cerrado.
//
// TODO (post-pago): cuando se conecte la pasarela de pago, el flujo
// pasarela → cuenta → acceso debería generar acá un token de registro
// directo (sin invitación de un Ejecutivo existente) asociado al pago
// confirmado, en vez de depender de /invitacion/[token]. Por ahora no
// está implementado.
export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    (async () => {
      const token = searchParams.get("token");
      if (!token) {
        router.replace("/login?registro=cerrado");
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_invitation", { p_token: token });
      const inv = Array.isArray(data) ? data[0] : data;

      if (error || !inv) {
        router.replace("/login?registro=cerrado");
        return;
      }

      router.replace(`/invitacion/${token}`);
    })();
  }, [router, searchParams]);

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`}>
      <div className="cp-auth-wrap">
        <div className="hexbg"></div>
        <div className="cp-theme-toggle-floating">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <div className="soon-box" style={{ position: "relative", zIndex: 1 }}>
          <span className="hex"></span>
          <h4>Verificando invitación…</h4>
        </div>
      </div>
    </div>
  );
}
