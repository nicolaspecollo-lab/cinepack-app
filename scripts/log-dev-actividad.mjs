// Registra una entrada en el historial de desarrollo (tabla dev_actividad,
// visible en /admin/desarrollo). Se corre una vez por cada "Corte!" que
// toca una herramienta del catálogo, después del deploy.
//
// Uso:
//   node scripts/log-dev-actividad.mjs \
//     --id ej-polizas-permisos --depto Ejecutivo --estado desplegado \
//     --nombre "Pólizas de seguro" --nota "Se sacaron los permisos, ya los cubre prod-permisos" \
//     --commit e418f14
//
// Estados válidos: sin_revisar | confirmado | desplegado | rechazado | eliminado
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      out[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const required = ["id", "depto", "estado", "nombre"];
const missing = required.filter((k) => !args[k]);
if (missing.length) {
  console.error(`Faltan argumentos: ${missing.map((m) => "--" + m).join(", ")}`);
  process.exit(1);
}

const ESTADOS_VALIDOS = ["sin_revisar", "confirmado", "desplegado", "rechazado", "eliminado"];
if (!ESTADOS_VALIDOS.includes(args.estado)) {
  console.error(`Estado inválido: ${args.estado}. Válidos: ${ESTADOS_VALIDOS.join(", ")}`);
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { error } = await supabase.from("dev_actividad").insert({
  departamento: args.depto,
  herramienta_id: args.id,
  herramienta_nombre: args.nombre,
  estado: args.estado,
  nota: args.nota ?? null,
  commit_sha: args.commit ?? null,
});

if (error) {
  console.error(error);
  process.exit(1);
}
console.log(`Registrado: ${args.id} (${args.depto}) → ${args.estado}`);
