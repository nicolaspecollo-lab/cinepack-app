import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-black px-4 text-center">
      <h1 className="text-3xl font-semibold text-white">CINE PACK</h1>
      <p className="mt-2 max-w-md text-zinc-400">
        MVP de la app de producción. Iniciá sesión o creá una cuenta para acceder a tu panel.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-[#c8ff5e] px-4 py-2 font-medium text-black"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-white/10 px-4 py-2 font-medium text-white hover:border-[#f37fb5] hover:text-[#f37fb5]"
        >
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
