import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Impressum | Hygge Homes Analyse" };

export default function ImpressumPage() {
  return (
    <LegalPage
      title="Impressum"
      sections={[
        { heading: "Anbieter", placeholder: "Name bzw. Firma, Rechtsform, Anschrift." },
        { heading: "Vertretung", placeholder: "Vertretungsberechtigte Person(en)." },
        { heading: "Kontakt", placeholder: "Telefon, E-Mail-Adresse." },
        { heading: "Register und Steuern", placeholder: "Registergericht und -nummer, Umsatzsteuer-ID, soweit vorhanden." },
        { heading: "Verantwortlich für den Inhalt", placeholder: "Name und Anschrift nach § 18 Abs. 2 MStV, soweit einschlägig." },
        { heading: "Streitbeilegung", placeholder: "Hinweis zur Verbraucherstreitbeilegung, soweit einschlägig." },
      ]}
    />
  );
}
