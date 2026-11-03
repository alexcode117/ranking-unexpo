// Barra de avance dibujada como una cota de plano: |──────|
// La línea punteada de fondo es el total posible; `marca` señala con un trazo
// corto hasta dónde se ha evaluado (en la misma escala que `valor`).
export function Cota({
  valor,
  maximo,
  marca,
  indice,
}: {
  valor: number;
  maximo: number;
  marca?: number;
  indice: number;
}) {
  const aX = (v: number) => (maximo > 0 ? Math.min(v / maximo, 1) * 100 : 0);
  const x = Math.max(aX(valor), 1.5);
  return (
    <div className="cota" style={{ ["--i" as string]: indice }} aria-hidden="true">
      <svg viewBox="0 0 100 12" preserveAspectRatio="none">
        <line className="guia" x1="0" y1="6" x2="100" y2="6" vectorEffect="non-scaling-stroke" />
        {marca !== undefined && marca < maximo && (
          <line className="marca" x1={aX(marca)} y1="2" x2={aX(marca)} y2="10" vectorEffect="non-scaling-stroke" />
        )}
        <line className="tope" x1="0.3" y1="1" x2="0.3" y2="11" vectorEffect="non-scaling-stroke" />
        <g className="trazo">
          <line className="linea" x1="0" y1="6" x2={x} y2="6" vectorEffect="non-scaling-stroke" />
          <line className="tope" x1={x} y1="1" x2={x} y2="11" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    </div>
  );
}
