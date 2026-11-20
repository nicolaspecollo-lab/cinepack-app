// Crea (vía signup público, sin necesitar service_role) una cuenta de
// prueba por cada cargo listado en cargos.md, contra cinepack-dev.
//
// IMPORTANTE: correr con NODE_USE_ENV_PROXY=1 — el fetch nativo de Node
// necesita ese flag para pasar por el proxy de red de esta sesión; sin
// él, el signup falla con ENOTFOUND aunque el host esté permitido.
//
// Uso:
//   NODE_USE_ENV_PROXY=1 node oficina-qa/scripts/crear-cuentas-qa.mjs
//
// Requiere .env.local con NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
// ya apuntando a cinepack-dev (confirmado 17/11/2026).
//
// No requiere "Confirm email" desactivado para CREAR la cuenta (el signup
// funciona igual), pero SÍ lo requiere para poder luego iniciar sesión con
// ella sin pasar por el link de confirmación — confirmar con Nico antes de
// que cada cargo intente loguearse de verdad.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const PASSWORD = "CinepackQA-2026!tester";

function parseEnv() {
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1)];
      })
  );
}

function parseCargosMd(path) {
  const text = readFileSync(path, "utf8");
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("| ") || /^\|\s*#/.test(line) || /^\|---/.test(line)) continue;
    const cols = line.split("|").map((c) => c.trim());
    // | # | Depto | Cargo | Herramienta(s) | Cuenta | Personalidad |
    if (cols.length < 7) continue;
    const email = cols[5];
    const cargo = cols[3];
    if (!email || !email.includes("@")) continue;
    rows.push({ cargo, email });
  }
  return rows;
}

const env = parseEnv();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  process.exit(1);
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const soloEstos = process.argv.slice(2); // opcional: lista de emails para probar solo algunos
const cargos = parseCargosMd("oficina-qa/cargos.md").filter(
  (c) => soloEstos.length === 0 || soloEstos.includes(c.email)
);

console.log(`Creando ${cargos.length} cuenta(s) de prueba contra ${env.NEXT_PUBLIC_SUPABASE_URL}...`);

let ok = 0;
let err = 0;
for (const { cargo, email } of cargos) {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password: PASSWORD });
    if (error) {
      console.log(`ERROR  ${email} (${cargo}): ${error.message}`);
      err++;
    } else {
      console.log(`OK     ${email} (${cargo}) -> user_id ${data.user?.id}`);
      ok++;
    }
  } catch (e) {
    console.log(`EXC    ${email} (${cargo}): ${e.message}`);
    err++;
  }
  // pequeña pausa para no disparar rate-limit de Supabase Auth
  await new Promise((r) => setTimeout(r, 400));
}

console.log(`\nResumen: ${ok} OK, ${err} con error, de ${cargos.length} totales.`);
