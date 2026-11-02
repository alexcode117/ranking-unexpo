import type { Metadata } from "next";
import { Architects_Daughter, Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

// Barlow Condensed recuerda la rotulación técnica normalizada; Barlow para lectura;
// Architects Daughter solo para las anotaciones en "lápiz rojo".
const rotulo = Barlow_Condensed({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-rotulo" });
const texto = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-texto" });
const mano = Architects_Daughter({ subsets: ["latin"], weight: "400", variable: "--f-mano" });

export const metadata: Metadata = {
  title: "Ranking UNEXPO",
  description: "Puntos acumulados y ranking de Dibujo Técnico I y II.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${rotulo.variable} ${texto.variable} ${mano.variable}`}>
      <body>{children}</body>
    </html>
  );
}
