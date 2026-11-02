"use server";

import { normalizarCedula } from "@/lib/cedula";
import * as demo from "@/lib/demo";
import { modoDemo } from "@/lib/datos";
import { supabaseServidor } from "@/lib/supabase/server";

// Devuelve solo el id interno del estudiante para resaltar su fila.
export async function buscarCedula(texto: string): Promise<string | null> {
  const cedula = normalizarCedula(texto);
  if (!cedula) return null;
  if (modoDemo) return demo.buscarCedula(cedula);
  const sb = await supabaseServidor();
  const { data, error } = await sb.rpc("buscar_cedula", { p_cedula: cedula });
  if (error) throw new Error("No se pudo buscar la cédula");
  return (data as string | null) ?? null;
}
