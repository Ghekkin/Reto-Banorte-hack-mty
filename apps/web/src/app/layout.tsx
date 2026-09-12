import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MARCA } from "@/lib/marca";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Maya — la pantalla que resuelve, no el párrafo que explica",
  description:
    "Prototipo de hackathon: un agente de salud financiera que construye la interfaz que resuelve tu problema y ejecuta la operación. Reto Banorte · Hack Monterrey 2026.",
  other: { "aviso-prototipo": MARCA.aviso },
};

/**
 * `viewportFit: "cover"` es lo que habilita `env(safe-area-inset-bottom)`: sin esto la
 * barra de pestanas queda debajo de la barra gestual del iPhone.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F2F2F3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
