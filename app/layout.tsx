import type { Metadata } from "next";
import { Jost, Oswald } from "next/font/google";
import "./globals.css";
import { AnalysisProvider } from "@/components/providers";
import { SiteHeader } from "@/components/header";

const display = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const sans = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Hygge Homes | Objekt- und Standortanalyse",
  description:
    "Wirtschaftliche Analyse von Ferienunterkünften und Standorten: Umsatz, Kosten, Energie und gewichtete Objektbewertung.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AnalysisProvider>
          <SiteHeader />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
            {children}
          </main>
          <footer className="border-t border-line py-6">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 text-sm text-muted flex flex-wrap gap-x-6 gap-y-1 justify-between">
              <span>Hygge Homes · Objekt- und Standortanalyse</span>
              <span>
                Alle Daten bleiben im Browser und werden dort automatisch
                zwischengespeichert. Dauerhaft sichern per JSON-Export.
              </span>
            </div>
          </footer>
        </AnalysisProvider>
      </body>
    </html>
  );
}
