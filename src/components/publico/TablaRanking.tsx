"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import { buscarCedula } from "@/app/acciones";
import { distribucion, formatear, porcentaje, type FilaRanking } from "@/lib/ranking";
import type { Tema } from "@/lib/temas";
import { Cota } from "./Cota";
import { Mina } from "./Mina";

const CLAVE = "ranking-unexpo:cedula";

type Modo = "seccion" | "materia";

export function TablaRanking({
  filas,
  modo,
  evaluado,
  tema,
  cedulaEjemplo,
}: {
  filas: FilaRanking[];
  modo: Modo;
  evaluado: number;
  tema: Tema;
  cedulaEjemplo?: string; // solo en modo demo, para probar la búsqueda
}) {
  const [texto, setTexto] = useState("");
  const [tuId, setTuId] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [buscando, iniciar] = useTransition();
  const tuya = filas.find((f) => f.estudiante_id === tuId) ?? null;
  const conteo = new Map(distribucion(filas, tema).map((d) => [d.rango.codigo, d.cantidad]));

  const verFila = (id: string) =>
    requestAnimationFrame(() =>
      document.getElementById(`fila-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );

  function buscar(valor: string, recordar: boolean) {
    iniciar(async () => {
      setAviso("");
      try {
        const id = await buscarCedula(valor);
        if (!id || !filas.some((f) => f.estudiante_id === id)) {
          setTuId(null);
          // Una cédula recordada de otra materia no debe mostrar error al abrir la página.
          if (recordar) {
            setAviso(
              id
                ? "Esa cédula está registrada, pero no en esta lista. Revisa la sección o la materia."
                : "No hay ningún estudiante con esa cédula. Revisa los números e inténtalo de nuevo.",
            );
          }
          return;
        }
        setTuId(id);
        if (recordar) {
          try {
            localStorage.setItem(CLAVE, valor);
          } catch {}
        }
      } catch {
        setAviso("La búsqueda no respondió. Inténtalo de nuevo en unos segundos.");
      }
    });
  }

  // Recordar la cédula en este navegador para mostrar tu ficha al volver.
  useEffect(() => {
    let guardada: string | null = null;
    try {
      guardada = localStorage.getItem(CLAVE);
    } catch {}
    if (guardada) {
      setTexto(guardada);
      buscar(guardada, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <form
        className="ubicarme"
        onSubmit={(e) => {
          e.preventDefault();
          if (texto.trim()) buscar(texto, true);
        }}
      >
        <label htmlFor="cedula">Ubícate en la lista</label>
        <input
          id="cedula"
          inputMode="numeric"
          autoComplete="off"
          placeholder={cedulaEjemplo ? `Prueba con ${cedulaEjemplo}` : "Tu número de cédula"}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button disabled={buscando}>{buscando ? "Buscando…" : "Buscar"}</button>
        {aviso ? (
          <p className="aviso" role="alert">
            {aviso}
          </p>
        ) : (
          <p className="ayuda">Las cédulas se muestran recortadas. Este navegador recordará la tuya.</p>
        )}
      </form>

      {tuya && <Ficha fila={tuya} total={filas.length} modo={modo} alVer={() => verFila(tuya.estudiante_id)} />}

      <Podio filas={filas} modo={modo} />
      <Escala filas={filas} tema={tema} tuRango={tuya?.rango.codigo} />

      <div className="tabla-titulo">
        <h2>Lista completa</h2>
        <p>
          {modo === "seccion"
            ? `${filas.length} estudiantes. Se han evaluado ${formatear(evaluado)} de 100 puntos.`
            : `${filas.length} estudiantes de todas las secciones. Como cada sección va a su ritmo, se comparan por rendimiento: el porcentaje de los puntos evaluados que ha obtenido cada uno.`}
        </p>
      </div>
      <ol className="ranking">
        <li className="fila encabezado" aria-hidden="true">
          <span className="num">Puesto</span>
          <span>Estudiante</span>
          <span>{modo === "seccion" ? "Avance sobre 100 pts" : "Avance sobre lo evaluado"}</span>
          <span className="pts">{modo === "seccion" ? "Puntos" : "Rendimiento"}</span>
          <span />
        </li>
        {filas.map((f, i) => {
          const esTuya = f.estudiante_id === tuId;
          const anterior = filas[i - 1];
          const empate = anterior?.posicion === f.posicion;
          const indice = Math.min(i, 30);
          return (
            <Fragment key={`${f.seccion_id}-${f.estudiante_id}`}>
              {/* Línea de corte al cambiar de rango, como el corte A–A de un plano */}
              {anterior?.rango.codigo !== f.rango.codigo && (
                <li className="corte" data-rango={f.rango.codigo}>
                  <b>{f.rango.codigo}</b>
                  <span className="nombre-corte">{f.rango.nombre}</span>
                  {/* La raya tiene el grosor que deja la mina de ese rango */}
                  <span
                    className="raya"
                    aria-hidden="true"
                    style={{ ["--grosor" as string]: `${Math.max(1, f.rango.trazo * 0.55)}px` }}
                  />
                  <span className="cuantos">
                    {conteo.get(f.rango.codigo)} {conteo.get(f.rango.codigo) === 1 ? "estudiante" : "estudiantes"}
                  </span>
                </li>
              )}
              <li id={`fila-${f.estudiante_id}`} className={`fila${esTuya ? " tu-fila" : ""}`}>
                <span className={`num${empate ? " empate" : ""}`} title={empate ? "Empatado con el anterior" : undefined}>
                  {f.posicion}
                </span>
                <span className="quien">
                  <span className="nombre">
                    {f.nombre}
                    {esTuya && <span className="tu">tú</span>}
                  </span>
                  <span className="dato">
                    <span className="cifra">{f.cedula}</span>
                    {modo === "materia" && <span>Sección {f.seccion}</span>}
                  </span>
                </span>
                {modo === "seccion" ? (
                  <Cota valor={f.puntos} maximo={100} marca={f.evaluado} indice={indice} />
                ) : (
                  <Cota valor={f.puntos} maximo={f.evaluado} indice={indice} />
                )}
                <span className="pts cifra">
                  {modo === "seccion" ? <Decimal valor={f.puntos} /> : porcentaje(f.rendimiento)}
                  {modo === "materia" && (
                    <small>
                      {formatear(f.puntos)} de {formatear(f.evaluado)} pts
                    </small>
                  )}
                </span>
                <Tendencia valor={f.tendencia} />
              </li>
            </Fragment>
          );
        })}
      </ol>
    </>
  );
}

function Ficha({ fila, total, modo, alVer }: { fila: FilaRanking; total: number; modo: Modo; alVer: () => void }) {
  let nota: string;
  if (fila.siguiente) {
    nota = `Te faltan ${formatear(fila.siguiente.faltan)} pts para subir a ${fila.siguiente.rango.codigo}, ${fila.siguiente.rango.nombre}.`;
  } else if (fila.posicion === 1) {
    nota = "Vas de primero. Mantén el trazo.";
  } else if (modo === "materia") {
    nota = "Abre tu sección para ver cuántos puntos te faltan para el siguiente rango.";
  } else {
    nota = "Estás en el rango más alto de la escala.";
  }
  return (
    <section className="ficha" aria-live="polite" aria-label="Tu ficha">
      <div className="puesto-grande">
        {fila.posicion}.º<small>de {total}</small>
      </div>
      <div>
        <div className="quien">{fila.nombre}</div>
        <div className="cifra">
          {modo === "seccion"
            ? `${formatear(fila.puntos)} puntos acumulados`
            : `${formatear(fila.puntos)} de ${formatear(fila.evaluado)} pts evaluados (${porcentaje(fila.rendimiento)})`}
        </div>
        <button type="button" className="ir" onClick={alVer}>
          Ver mi fila en la lista
        </button>
      </div>
      <div className="rango-grande">
        <Mina rango={fila.rango} conNombre />
      </div>
      <p className="nota-roja">{nota}</p>
    </section>
  );
}

function Podio({ filas, modo }: { filas: FilaRanking[]; modo: Modo }) {
  // Un escalón por puesto; los empatados comparten escalón.
  const escalones: FilaRanking[][] = [];
  for (const f of filas) {
    if (f.posicion > 3) break;
    const ultimo = escalones[escalones.length - 1];
    if (ultimo && ultimo[0].posicion === f.posicion) ultimo.push(f);
    else escalones.push([f]);
  }
  // Si casi todos empatan arriba no hay podio que mostrar.
  if (escalones.length < 2 || escalones[0].length > 3) return null;
  return (
    <section aria-labelledby="podio-titulo">
      <h2 id="podio-titulo" className="podio-titulo">
        Los mejores trazos
      </h2>
      <div className="podio">
        {escalones.map((grupo, i) => {
          const f = grupo[0];
          const nombres = grupo.length > 3 ? [...grupo.slice(0, 2).map((g) => g.nombre), `y ${grupo.length - 2} más`] : grupo.map((g) => g.nombre);
          return (
            <div key={f.estudiante_id} className="escalon" data-puesto={i + 1}>
              <span className="lugar">{f.posicion}</span>
              {nombres.map((n) => (
                <span key={n} className="nombre">
                  {n}
                </span>
              ))}
              <span className="valor cifra">
                {modo === "seccion" ? formatear(f.puntos) : porcentaje(f.rendimiento)}
              </span>
              <Mina rango={f.rango} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Escala({ filas, tema, tuRango }: { filas: FilaRanking[]; tema: Tema; tuRango?: string }) {
  let desde = 0;
  return (
    <section className="escala" aria-labelledby="escala-titulo">
      <h2 id="escala-titulo">La escala del lápiz</h2>
      <p>
        Tu rango depende de tu puesto en el grupo. Cuanto más arriba estés, más dura y precisa es tu mina.
      </p>
      <ol>
        {distribucion(filas, tema).map(({ rango, cantidad }) => {
          const tramo =
            desde === 0
              ? `Mejor ${Math.round(rango.hasta * 100)} %`
              : `Del ${Math.round(desde * 100)} al ${Math.min(100, Math.round(rango.hasta * 100))} %`;
          desde = rango.hasta;
          return (
            <li key={rango.codigo} className={rango.codigo === tuRango ? "tuyo" : undefined}>
              <svg viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true">
                <line x1="4" y1="11" x2="96" y2="11" strokeWidth={rango.trazo} vectorEffect="non-scaling-stroke" />
              </svg>
              <span className="codigo">{rango.codigo}</span>
              <span className="nombre">{rango.nombre}</span>
              <span className="cuantos">
                {cantidad} {cantidad === 1 ? "estudiante" : "estudiantes"}
                <br />
                <span className="tramo">{tramo}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// Cifra alineada por la coma: la parte decimal ocupa siempre el mismo ancho.
function Decimal({ valor }: { valor: number }) {
  const [entero, decimales] = formatear(valor).split(",");
  return (
    <span className="decimal">
      {entero}
      <span className="dec">{decimales ? `,${decimales}` : ""}</span>
    </span>
  );
}

function Tendencia({ valor }: { valor: number | null }) {
  // Siempre ocupa su columna para que las filas queden alineadas.
  if (!valor) return <span className="tendencia" />;
  const sube = valor > 0;
  const texto = `${sube ? "Subió" : "Bajó"} ${Math.abs(valor)} ${Math.abs(valor) === 1 ? "puesto" : "puestos"} con la última evaluación`;
  return (
    <span className={`tendencia ${sube ? "sube" : "baja"}`} title={texto}>
      <span aria-hidden="true">{sube ? "▲" : "▼"}</span>
      {Math.abs(valor)}
      <span className="sr-only">{texto}</span>
    </span>
  );
}
