"use client";

import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/cliente";

export function CerrarSesion() {
  const router = useRouter();
  return (
    <button
      className="btn chico"
      onClick={async () => {
        await supabaseNavegador().auth.signOut();
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      Cerrar sesión
    </button>
  );
}
