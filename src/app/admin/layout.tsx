import Link from "next/link";
import { supabaseConfigurado } from "@/lib/supabase/server";
import { CerrarSesion } from "@/components/admin/CerrarSesion";

export const metadata = { title: "Admin · Ranking UNEXPO" };

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
    <main className="papel">
      <div className="contenedor">
        <header className="barra-admin">
          <Link href="/admin" className="marca">
            Mesa de dibujo
          </Link>
          <div className="enlinea">
            <Link href="/" className="btn chico" target="_blank">
              Abrir sitio público
            </Link>
            {supabaseConfigurado && <CerrarSesion />}
          </div>
        </header>
        {supabaseConfigurado ? (
          children
        ) : (
          <div className="panel">
            <h2>Falta conectar Supabase</h2>
            <p>
              Crea el archivo <code>.env.local</code> con <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (ver <code>LEEME.md</code>) y reinicia el servidor. Mientras
              tanto, el sitio público muestra datos de demostración.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
