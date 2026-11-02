import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const supabaseConfigurado = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export async function supabaseServidor() {
  const almacen = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll: (lista) => {
          // En Server Components no se pueden escribir cookies; el middleware las refresca.
          try {
            lista.forEach(({ name, value, options }) => almacen.set(name, value, options));
          } catch {}
        },
      },
    },
  );
}
