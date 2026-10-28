import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "AGB | Hygge Homes Analyse" };

export default function AgbPage() {
  return (
    <LegalPage
      title="Allgemeine Geschäftsbedingungen"
      sections={[
        { heading: "Geltungsbereich", placeholder: "Vertragspartner, Geltung für die Nutzung der Anwendung." },
        { heading: "Leistungsumfang", placeholder: "Beschreibung der Analysefunktionen; Hinweis, dass Ergebnisse auf Nutzereingaben und dokumentierten Annahmen beruhen und keine Anlage- oder Rechtsberatung darstellen." },
        { heading: "Zugang und Konto", placeholder: "Einladung, Zugangsdaten, Sorgfaltspflichten." },
        { heading: "Preise und Laufzeit", placeholder: "Plan, Vergütung, Kündigung (nach Anbieterentscheidung in Phase 3 zu ergänzen)." },
        { heading: "Haftung", placeholder: "Haftungsregelungen." },
        { heading: "Schlussbestimmungen", placeholder: "Anwendbares Recht, Gerichtsstand, salvatorische Klausel." },
      ]}
    />
  );
}
