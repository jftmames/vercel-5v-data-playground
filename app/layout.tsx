import "./../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "5V Data Playground",
  description: "Generador de datos estructurados, semiestructurados y no estructurados a partir de prompts"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white">{children}</body>
    </html>
  );
}
