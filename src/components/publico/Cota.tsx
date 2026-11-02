import { formatear } from "@/lib/ranking";

// Barra de progreso dibujada como una cota de plano: |◄──── valor ────►|
// La línea punteada de fondo marca el total posible.
export function Cota({
  valor,
  maximo,
  etiqueta,
  indice,
}: {
  valor: number;
  maximo: number;
  etiqueta?: string;
  indice: number;
}) {
  const fraccion = maximo > 0 ? Math.min(valor / maximo, 1) : 0;
  const x = Math.max(fraccion * 100, 1.5);
  return (
    <div className="cota" style={{ ["--i" as string]: indice }}>
      <span className="valor cifra">
        {formatear(valor)} <small>de {formatear(maximo)}</small>
        {etiqueta && <small> ({etiqueta})</small>}
      </span>
      <svg viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true">
        <line className="guia" x1="0" y1="7" x2="100" y2="7" vectorEffect="non-scaling-stroke" />
        <line className="tope" x1="0.3" y1="1" x2="0.3" y2="13" vectorEffect="non-scaling-stroke" />
        <g className="trazo">
          <line className="linea" x1="0" y1="7" x2={x} y2="7" vectorEffect="non-scaling-stroke" />
          <line className="tope" x1={x} y1="1" x2={x} y2="13" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    </div>
  );
}
