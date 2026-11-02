"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/cliente";

export default function Login() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    const { error } = await supabaseNavegador().auth.signInWithPassword({ email: correo, password: clave });
    setEnviando(false);
    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="login panel">
      <h1 style={{ margin: "4px 0 16px" }}>Acceso del profesor</h1>
      <form onSubmit={entrar}>
        <label>
          Correo
          <input type="email" required autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            required
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        </label>
        {error && <div className="mensaje error">{error}</div>}
        <button className="btn primario" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
