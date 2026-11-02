import "server-only";
import { cache } from "react";
import * as demo from "./demo";
import type { Puntaje } from "./ranking";
import { supabaseConfigurado, supabaseServidor } from "./supabase/server";

export type Materia = { id: string; slug: string; nombre: string; tema: string };
export type Lapso = { id: string; codigo: string; activo: boolean };
export type Seccion = { id: string; materia_id: string; lapso_id: string; codigo: string };

export const modoDemo = !supabaseConfigurado;

function falla(contexto: string, error: { message: string }): never {
  throw new Error(`${contexto}: ${error.message}`);
}

export const listarMaterias = cache(async (): Promise<Materia[]> => {
  if (modoDemo) return demo.materias;
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("materias").select("id, slug, nombre, tema").order("orden");
  if (error) falla("materias", error);
  return data;
});

export async function materiaPorSlug(slug: string) {
  return (await listarMaterias()).find((m) => m.slug === slug) ?? null;
}

export const listarLapsos = cache(async (): Promise<Lapso[]> => {
  if (modoDemo) return demo.lapsos;
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("lapsos")
    .select("id, codigo, activo")
    .order("creado", { ascending: false });
  if (error) falla("lapsos", error);
  return data;
});

// El lapso pedido por URL, o el activo, o el más reciente.
export async function resolverLapso(codigo?: string): Promise<Lapso | null> {
  const lapsos = await listarLapsos();
  return (
    (codigo && lapsos.find((l) => l.codigo === codigo)) ||
    lapsos.find((l) => l.activo) ||
    lapsos[0] ||
    null
  );
}

export async function seccionesDe(materiaId: string, lapsoId: string): Promise<Seccion[]> {
  if (modoDemo) {
    return demo.secciones.filter((s) => s.materia_id === materiaId && s.lapso_id === lapsoId);
  }
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("secciones")
    .select("id, materia_id, lapso_id, codigo")
    .eq("materia_id", materiaId)
    .eq("lapso_id", lapsoId)
    .order("codigo");
  if (error) falla("secciones", error);
  return data;
}

export async function puntajesDe(materiaId: string, lapsoId: string): Promise<Puntaje[]> {
  if (modoDemo) return demo.puntajes(materiaId, lapsoId);
  const sb = await supabaseServidor();
  const { data, error } = await sb.rpc("puntajes", { p_materia: materiaId, p_lapso: lapsoId });
  if (error) falla("puntajes", error);
  return (data as Puntaje[]).map((f) => ({
    ...f,
    puntos: Number(f.puntos),
    puntos_previos: Number(f.puntos_previos),
    evaluado: Number(f.evaluado),
    evaluado_previo: Number(f.evaluado_previo),
  }));
}
