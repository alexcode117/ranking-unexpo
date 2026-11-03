import type { Rango } from "@/lib/temas";

// Rango dibujado como el trazo que deja esa mina: 6B grueso, 9H fino.
export function Mina({
  rango,
  conNombre = false,
}: {
  rango: Rango;
  conNombre?: boolean;
}) {
  return (
    <span className="mina" title={`${rango.codigo}: ${rango.nombre}`}>
      <svg viewBox="0 0 34 12" aria-hidden="true">
        <line x1="2" y1="6" x2="32" y2="6" strokeWidth={rango.trazo} />
      </svg>
      <span className="texto-mina">
        <b>{rango.codigo}</b>
        {conNombre && <span className="nombre-rango">{rango.nombre}</span>}
      </span>
    </span>
  );
}
