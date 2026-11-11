/**
 * Rechtstext "datenschutz.md", Stand November 2026, unverändert übernommen; die
 * Markdown-Struktur liegt als Blöcke vor. Änderungen am Text nur über die
 * Vorlage und erneutes Einsetzen.
 */
import type { LegalBlock } from "@/lib/legal/types";

export const DATENSCHUTZ_BLOCKS: LegalBlock[] = [
  {
    "type": "h1",
    "text": "Datenschutzerklärung"
  },
  {
    "type": "p",
    "text": "Stand: November 2026"
  },
  {
    "type": "h2",
    "text": "1. Überblick"
  },
  {
    "type": "p",
    "text": "Diese Datenschutzerklärung informiert Sie darüber, welche personenbezogenen Daten wir bei der Nutzung des Online-Tools „Hygge Homes Analyse“ (im Folgenden „Tool“) verarbeiten, zu welchen Zwecken das geschieht und welche Rechte Sie haben."
  },
  {
    "type": "p",
    "text": "Kurz zusammengefasst:"
  },
  {
    "type": "ul",
    "items": [
      "Wir verarbeiten Ihre Daten, um Ihnen ein Nutzerkonto und die Funktionen des Tools bereitzustellen.",
      "Wir setzen keine Analyse-, Tracking- oder Werbedienste ein. [PRÜFEN: Vercel Analytics und Speed Insights sind im Projekt deaktiviert.]",
      "Wir verwenden ausschließlich technisch notwendige Cookies.",
      "Wir geben Ihre Daten nur an Dienstleister weiter, die wir für den Betrieb des Tools benötigen."
    ]
  },
  {
    "type": "h2",
    "text": "2. Verantwortlicher"
  },
  {
    "type": "p",
    "text": "Verantwortlich für die Datenverarbeitung ist:"
  },
  {
    "type": "p",
    "text": "Westerwiede & Westerwiede GbR\nvertreten durch die Gesellschafter Thilo Westerwiede und Anna Westerwiede\nHabichtsweg 21\n21385 Amelinghausen"
  },
  {
    "type": "p",
    "text": "E-Mail: info@hygge-homes.de\nTelefon: +49 4171 60 888 20"
  },
  {
    "type": "p",
    "text": "Ein Datenschutzbeauftragter ist nicht benannt, da hierzu keine gesetzliche Pflicht besteht."
  },
  {
    "type": "h2",
    "text": "3. Hosting und Server-Protokolle"
  },
  {
    "type": "p",
    "text": "Das Tool wird bei der Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, USA, gehostet. [PRÜFEN: Anschrift]"
  },
  {
    "type": "p",
    "text": "Bei jedem Aufruf des Tools verarbeitet der Hoster automatisch Daten, die Ihr Browser übermittelt:"
  },
  {
    "type": "ul",
    "items": [
      "IP-Adresse",
      "Datum und Uhrzeit der Anfrage",
      "aufgerufene Adresse und übertragene Datenmenge",
      "Browsertyp, Browserversion und Betriebssystem",
      "Referrer-URL"
    ]
  },
  {
    "type": "p",
    "text": "Diese Daten sind erforderlich, um das Tool auszuliefern, die Stabilität und Sicherheit zu gewährleisten und Fehler zu beheben. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und funktionsfähigen Betrieb) sowie Art. 6 Abs. 1 lit. b DSGVO, soweit Sie das Tool als registrierter Nutzer verwenden."
  },
  {
    "type": "p",
    "text": "Mit Vercel besteht ein Vertrag über Auftragsverarbeitung. Eine Verarbeitung in den USA kann nicht ausgeschlossen werden. Die Übermittlung stützt sich auf den Angemessenheitsbeschluss der EU-Kommission zum EU-US Data Privacy Framework, unter dem Vercel zertifiziert ist, sowie ergänzend auf Standardvertragsklauseln. [PRÜFEN: aktuelle Zertifizierung und abgeschlossener Vertrag]"
  },
  {
    "type": "h2",
    "text": "4. Datenbank und Anmeldung"
  },
  {
    "type": "p",
    "text": "Für die Speicherung der Daten und die Anmeldung nutzen wir den Dienst Supabase der Supabase Inc., 970 Toa Payoh North #07-04, Singapur 318992. [PRÜFEN: Anschrift]"
  },
  {
    "type": "p",
    "text": "Die Daten werden auf Servern in der Europäischen Union (Irland) gespeichert. Supabase verarbeitet dabei:"
  },
  {
    "type": "ul",
    "items": [
      "Ihre Kontodaten (siehe Abschnitt 5)",
      "Ihr Passwort in verschlüsselter Form (Hashwert)",
      "Anmeldedaten wie Zeitpunkt der letzten Anmeldung und Sitzungsinformationen",
      "die Inhalte, die Sie im Tool speichern (siehe Abschnitt 6)"
    ]
  },
  {
    "type": "p",
    "text": "Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Mit Supabase besteht ein Vertrag über Auftragsverarbeitung einschließlich Standardvertragsklauseln für den Fall, dass ein Zugriff aus einem Drittland erfolgt. [PRÜFEN: Vertrag abgeschlossen]"
  },
  {
    "type": "h2",
    "text": "5. Registrierung und Nutzerkonto"
  },
  {
    "type": "p",
    "text": "Für die Nutzung des Tools ist ein Nutzerkonto erforderlich. Bei der Registrierung verarbeiten wir:"
  },
  {
    "type": "ul",
    "items": [
      "E-Mail-Adresse (Pflichtangabe)",
      "Passwort (Pflichtangabe, verschlüsselt gespeichert)",
      "Anzeigename (freiwillig)",
      "Zeitpunkt der Registrierung und der Bestätigung Ihrer E-Mail-Adresse",
      "Ihre Zustimmung zu den Nutzungsbedingungen und die Kenntnisnahme dieser Datenschutzerklärung",
      "Tarif, Gültigkeitszeitraum, Rolle und Status Ihres Kontos"
    ]
  },
  {
    "type": "p",
    "text": "Nach der Registrierung erhalten Sie eine E-Mail mit einem Bestätigungslink. Erst nach der Bestätigung ist eine Anmeldung möglich. So stellen wir sicher, dass die E-Mail-Adresse tatsächlich Ihnen gehört."
  },
  {
    "type": "p",
    "text": "Wir nutzen Ihre E-Mail-Adresse außerdem, um Ihnen notwendige Nachrichten zum Konto zu senden, etwa zum Zurücksetzen des Passworts oder zu wichtigen Änderungen des Angebots. Werbung senden wir Ihnen nur mit Ihrer gesonderten Einwilligung."
  },
  {
    "type": "p",
    "text": "Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Durchführung des Nutzungsverhältnisses)."
  },
  {
    "type": "p",
    "text": "Personen, die bei uns mit der Verwaltung des Tools betraut sind, können Ihre Kontodaten einsehen, soweit das für Betrieb, Support und Missbrauchsabwehr erforderlich ist."
  },
  {
    "type": "h2",
    "text": "6. Inhalte, die Sie im Tool speichern"
  },
  {
    "type": "p",
    "text": "Im Tool können Sie folgende Inhalte erfassen und speichern:"
  },
  {
    "type": "ul",
    "items": [
      "Angaben zu Objekten und Standorten (zum Beispiel Bezeichnung, Adresse, Koordinaten, Flächen, Preise, Kosten und Annahmen)",
      "Profil- und Firmendaten (zum Beispiel Firmenname, Anschrift, Kontaktdaten, Registerangaben, Logo, Farben, Firmensitz)",
      "Einstellungen und Standardannahmen"
    ]
  },
  {
    "type": "p",
    "text": "Alle diese Angaben sind freiwillig. Wir verarbeiten sie ausschließlich, um Ihnen die Berechnungen, Vergleiche und Berichte bereitzustellen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO."
  },
  {
    "type": "p",
    "text": "Bitte erfassen Sie im Tool keine personenbezogenen Daten Dritter, sofern Sie dazu nicht berechtigt sind."
  },
  {
    "type": "h2",
    "text": "7. E-Mail-Versand"
  },
  {
    "type": "p",
    "text": "System-E-Mails (Bestätigung der Registrierung, Einladung, Zurücksetzen des Passworts) versenden wir über ein Postfach bei der Strato GmbH, Otto-Ostrowski-Straße 7, 10249 Berlin. Dabei werden Ihre E-Mail-Adresse und der Inhalt der jeweiligen Nachricht verarbeitet."
  },
  {
    "type": "p",
    "text": "Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Mit Strato besteht ein Vertrag über Auftragsverarbeitung. [PRÜFEN: Vertrag im Strato-Kundenbereich abgeschlossen]"
  },
  {
    "type": "h2",
    "text": "8. Ermittlung von Koordinaten (Geokodierung)"
  },
  {
    "type": "p",
    "text": "Wenn Sie zu einer Adresse die Koordinaten ermitteln lassen, sendet unser Server die eingegebene Adresse an den Dienst Nominatim der OpenStreetMap Foundation, St John’s Innovation Centre, Cowley Road, Cambridge CB4 0WS, Vereinigtes Königreich."
  },
  {
    "type": "p",
    "text": "Die Anfrage erfolgt von unserem Server aus. Ihre IP-Adresse und Ihre Kontodaten werden dabei nicht an OpenStreetMap übermittelt, sondern nur die Adresse selbst. Die Funktion wird nur ausgelöst, wenn Sie sie aktiv nutzen."
  },
  {
    "type": "p",
    "text": "Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Für das Vereinigte Königreich besteht ein Angemessenheitsbeschluss der EU-Kommission."
  },
  {
    "type": "h2",
    "text": "9. Cookies und lokale Speicherung"
  },
  {
    "type": "p",
    "text": "Wir verwenden ausschließlich technisch notwendige Cookies und vergleichbare Speicherungen in Ihrem Browser:"
  },
  {
    "type": "ul",
    "items": [
      "Sitzungs-Cookies für die Anmeldung, damit Sie nach dem Login angemeldet bleiben",
      "ein Cookie, das die Höchstdauer einer Sitzung absichert (automatische Abmeldung nach 12 Stunden)",
      "eine Zwischenspeicherung noch nicht gesicherter Eingaben in Ihrem Browser, damit bei einer Unterbrechung keine Daten verloren gehen"
    ]
  },
  {
    "type": "p",
    "text": "Diese Speicherungen sind erforderlich, um den von Ihnen gewünschten Dienst bereitzustellen (§ 25 Abs. 2 Nr. 2 TDDDG). Eine Einwilligung ist dafür nicht nötig. Die weitere Verarbeitung beruht auf Art. 6 Abs. 1 lit. b DSGVO."
  },
  {
    "type": "p",
    "text": "Cookies zu Analyse- oder Werbezwecken setzen wir nicht ein. Schriftarten werden von unserem eigenen Server geladen, es besteht keine Verbindung zu Servern von Schriftanbietern."
  },
  {
    "type": "h2",
    "text": "10. Schutz vor Missbrauch"
  },
  {
    "type": "p",
    "text": "Zum Schutz vor automatisierten Registrierungen und missbräuchlicher Nutzung begrenzen wir die Anzahl bestimmter Anfragen je Zeitraum. Dazu wird Ihre IP-Adresse oder Ihre Nutzerkennung kurzzeitig, höchstens für etwa eine Stunde, im Arbeitsspeicher des Servers verarbeitet. Das Registrierungsformular enthält außerdem ein für Menschen unsichtbares Feld, mit dem automatisierte Eingaben erkannt werden."
  },
  {
    "type": "p",
    "text": "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Sicherheit des Tools)."
  },
  {
    "type": "h2",
    "text": "11. Kontaktaufnahme"
  },
  {
    "type": "p",
    "text": "Wenn Sie uns per E-Mail oder Telefon kontaktieren, verarbeiten wir Ihre Angaben, um Ihr Anliegen zu bearbeiten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage mit einem Vertrag zusammenhängt, sonst Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Bearbeitung von Anfragen)."
  },
  {
    "type": "p",
    "text": "Wir löschen die Anfragen, sobald sie erledigt sind und keine gesetzlichen Aufbewahrungspflichten entgegenstehen."
  },
  {
    "type": "h2",
    "text": "12. Zahlungsabwicklung bei kostenpflichtigen Tarifen"
  },
  {
    "type": "p",
    "text": "[PRÜFEN: Dieser Abschnitt gilt erst, wenn kostenpflichtige Tarife angeboten werden. Anbieter nach der endgültigen Entscheidung anpassen. Bis dahin kann der Abschnitt entfallen.]"
  },
  {
    "type": "p",
    "text": "Wenn Sie einen kostenpflichtigen Tarif abschließen, erfolgt die Zahlungsabwicklung über die Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irland."
  },
  {
    "type": "p",
    "text": "Sie geben Ihre Zahlungsdaten direkt auf der Bezahlseite des Zahlungsdienstleisters ein. Wir selbst speichern keine vollständigen Karten- oder Kontodaten. Wir erhalten vom Zahlungsdienstleister Informationen zum Status Ihres Abonnements, zum Abrechnungszeitraum, zu Zahlungen und Rechnungen sowie eine Kundenkennung. Für die Rechnungsstellung verarbeiten wir außerdem Ihre Rechnungsanschrift."
  },
  {
    "type": "p",
    "text": "Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragsabwicklung) sowie Art. 6 Abs. 1 lit. c DSGVO, soweit wir gesetzlich zur Aufbewahrung von Rechnungsdaten verpflichtet sind. Der Zahlungsdienstleister verarbeitet Daten teilweise in eigener Verantwortung, etwa zur Betrugsprävention. Einzelheiten finden Sie in dessen Datenschutzerklärung unter https://stripe.com/de/privacy."
  },
  {
    "type": "h2",
    "text": "13. Empfänger und Übermittlung in Drittländer"
  },
  {
    "type": "p",
    "text": "Wir geben personenbezogene Daten nur an die in dieser Erklärung genannten Dienstleister weiter:"
  },
  {
    "type": "ul",
    "items": [
      "Vercel Inc. (Hosting), USA",
      "Supabase Inc. (Datenbank und Anmeldung), Speicherort Irland",
      "Strato GmbH (E-Mail-Versand), Deutschland",
      "OpenStreetMap Foundation (Geokodierung, nur eingegebene Adressen), Vereinigtes Königreich",
      "Zahlungsdienstleister (nur bei kostenpflichtigen Tarifen)"
    ]
  },
  {
    "type": "p",
    "text": "Eine Weitergabe zu Werbezwecken oder ein Verkauf Ihrer Daten findet nicht statt. Darüber hinaus geben wir Daten nur weiter, wenn wir gesetzlich dazu verpflichtet sind."
  },
  {
    "type": "p",
    "text": "Soweit Daten in Länder außerhalb der Europäischen Union übermittelt werden, geschieht das auf Grundlage eines Angemessenheitsbeschlusses der EU-Kommission oder von Standardvertragsklauseln."
  },
  {
    "type": "h2",
    "text": "14. Speicherdauer"
  },
  {
    "type": "ul",
    "items": [
      "Kontodaten und gespeicherte Inhalte: solange Ihr Nutzerkonto besteht. Nach Löschung des Kontos werden sie gelöscht.",
      "Konten, deren E-Mail-Adresse nicht bestätigt wurde: Löschung in regelmäßigen Abständen. [PRÜFEN: Frist festlegen, zum Beispiel nach 30 Tagen]",
      "Server-Protokolle: nach den Fristen des Hosters, in der Regel wenige Tage bis Wochen. [PRÜFEN]",
      "Vertrags- und Rechnungsdaten bei kostenpflichtigen Tarifen: nach den gesetzlichen Aufbewahrungsfristen, in der Regel bis zu zehn Jahre."
    ]
  },
  {
    "type": "p",
    "text": "Ihr Konto können Sie jederzeit löschen lassen. Schreiben Sie dazu an info@hygge-homes.de."
  },
  {
    "type": "h2",
    "text": "15. Ihre Rechte"
  },
  {
    "type": "p",
    "text": "Sie haben nach der DSGVO folgende Rechte:"
  },
  {
    "type": "ul",
    "items": [
      "Auskunft über die zu Ihrer Person gespeicherten Daten (Art. 15 DSGVO)",
      "Berichtigung unrichtiger Daten (Art. 16 DSGVO)",
      "Löschung (Art. 17 DSGVO)",
      "Einschränkung der Verarbeitung (Art. 18 DSGVO)",
      "Datenübertragbarkeit (Art. 20 DSGVO). Ihre Analysedaten können Sie im Tool selbst exportieren.",
      "Widerruf einer erteilten Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)"
    ]
  },
  {
    "type": "p",
    "text": "**Widerspruchsrecht (Art. 21 DSGVO):** Soweit wir Daten auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO verarbeiten, können Sie dieser Verarbeitung jederzeit aus Gründen widersprechen, die sich aus Ihrer besonderen Situation ergeben. Wir verarbeiten die Daten dann nicht mehr, es sei denn, wir können zwingende schutzwürdige Gründe nachweisen oder die Verarbeitung dient der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen."
  },
  {
    "type": "p",
    "text": "Zur Ausübung Ihrer Rechte genügt eine Nachricht an info@hygge-homes.de."
  },
  {
    "type": "h2",
    "text": "16. Beschwerderecht bei der Aufsichtsbehörde"
  },
  {
    "type": "p",
    "text": "Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren, insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthalts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes. Für uns zuständig ist:"
  },
  {
    "type": "p",
    "text": "Der Landesbeauftragte für den Datenschutz Niedersachsen\nPrinzenstraße 5\n30159 Hannover"
  },
  {
    "type": "h2",
    "text": "17. Pflicht zur Bereitstellung und automatisierte Entscheidungen"
  },
  {
    "type": "p",
    "text": "Die Angabe von E-Mail-Adresse und Passwort ist für die Nutzung des Tools erforderlich. Ohne diese Angaben können wir kein Nutzerkonto bereitstellen. Alle weiteren Angaben sind freiwillig."
  },
  {
    "type": "p",
    "text": "Eine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne von Art. 22 DSGVO findet nicht statt."
  },
  {
    "type": "h2",
    "text": "18. Sicherheit"
  },
  {
    "type": "p",
    "text": "Die Übertragung zwischen Ihrem Browser und dem Tool erfolgt verschlüsselt (TLS). Der Zugriff auf die Datenbank ist auf unsere Server beschränkt. Ein lückenloser Schutz vor dem Zugriff durch Dritte ist bei der Datenübertragung im Internet dennoch nicht möglich."
  },
  {
    "type": "h2",
    "text": "19. Änderungen dieser Datenschutzerklärung"
  },
  {
    "type": "p",
    "text": "Wir passen diese Datenschutzerklärung an, wenn sich das Tool, die eingesetzten Dienstleister oder die Rechtslage ändern. Es gilt die jeweils hier veröffentlichte Fassung."
  }
];
