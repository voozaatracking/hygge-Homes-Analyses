import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Datenschutz | Hygge Homes Analyse" };

export default function DatenschutzPage() {
  return (
    <LegalPage
      title="Datenschutzerklärung"
      sections={[
        { heading: "Verantwortlicher", placeholder: "Name und Kontaktdaten des Verantwortlichen." },
        { heading: "Verarbeitete Daten", placeholder: "Kontodaten (E-Mail, Anzeigename), Profil- und Firmendaten, eingegebene Analysedaten, Server-Logs." },
        { heading: "Zwecke und Rechtsgrundlagen", placeholder: "Bereitstellung der Anwendung, Vertragserfüllung, berechtigte Interessen; Rechtsgrundlagen benennen." },
        { heading: "Auftragsverarbeiter und Empfänger", placeholder: "Hosting (Vercel), Datenbank und Authentifizierung (Supabase), E-Mail-Versand (SMTP-Anbieter), Geokodierung (OpenStreetMap Nominatim; Adresstexte werden an den Dienst übermittelt)." },
        { heading: "Speicherdauer", placeholder: "Dauer der Speicherung und Löschfristen." },
        { heading: "Rechte der Betroffenen", placeholder: "Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch, Beschwerderecht." },
        { heading: "Cookies", placeholder: "Technisch notwendige Sitzungs-Cookies der Anmeldung; keine Tracking-Cookies." },
      ]}
    />
  );
}
