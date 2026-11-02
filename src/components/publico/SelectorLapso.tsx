"use client";

import { useRouter } from "next/navigation";

export function SelectorLapso({
  lapsos,
  actual,
  ruta,
}: {
  lapsos: { codigo: string; activo: boolean }[];
  actual: string;
  ruta: string;
}) {
  const router = useRouter();
  return (
    <select
      className="selector"
      id="lapso"
      value={actual}
      onChange={(e) => {
        const l = lapsos.find((x) => x.codigo === e.target.value);
        router.push(l?.activo ? ruta : `${ruta}?lapso=${encodeURIComponent(e.target.value)}`);
      }}
    >
      {lapsos.map((l) => (
        <option key={l.codigo} value={l.codigo}>
          {l.codigo}
          {l.activo ? " (en curso)" : ""}
        </option>
      ))}
    </select>
  );
}
