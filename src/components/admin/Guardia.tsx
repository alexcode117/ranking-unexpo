"use client";

import { useEffect, useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/cliente";

// Muestra el contenido solo si el usuario está en la tabla admins.
// La base de datos lo exige igual (RLS); esto solo evita pantallas vacías.
export function Guardia({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<"cargando" | "si" | { userId: string }>("cargando");

  useEffect(() => {
    const sb = supabaseNavegador();
    (async () => {
      const { data: u } = await sb.auth.getUser();
      const { data } = await sb.rpc("es_admin");
      setEstado(data === true ? "si" : { userId: u.user?.id ?? "?" });
    })();
  }, []);

  if (estado === "cargando") return <p className="estado-tenue">Cargando…</p>;
  if (estado === "si") return <>{children}</>;
  return (
    <div className="panel">
      <h2>Tu usuario aún no es administrador</h2>
      <p>Ejecuta esto una sola vez en Supabase, en SQL Editor:</p>
      <pre style={{ whiteSpace: "pre-wrap", background: "#fff", padding: 12, borderRadius: 4, border: "1px solid var(--borde)" }}>
        insert into admins (user_id) values (&apos;{estado.userId}&apos;);
      </pre>
    </div>
  );
}

export function mensajeError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  if (m.includes("duplicate key")) return "Ya existe un registro con ese nombre o código.";
  if (m.includes("violates foreign key")) return "No se puede borrar: tiene datos asociados.";
  return m;
}
