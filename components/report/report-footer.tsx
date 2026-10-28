import type { CompanySettings, ReportSettings } from "@/lib/profile/settings";

/**
 * Fuß des gebrandeten Reports: Kontakt, Registerangaben, Datum, Hinweistext.
 * Fehlende Felder werden nicht gerendert. Wiederverwendbar für die
 * Standortanalyse (spätere Phase).
 */
export function ReportFooter({
  company,
  report,
}: {
  company: CompanySettings;
  report: ReportSettings;
}) {
  const contact = [company.phone, company.email, company.website]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
  const today = new Date().toLocaleDateString("de-DE");
  const showContact = report.showCompanyFooter && Boolean(contact || company.registerInfo);
  const showDisclaimer = report.showDisclaimer && report.disclaimerText.trim() !== "";

  if (!showContact && !report.showDate && !showDisclaimer) return null;

  return (
    <footer className="report-footer">
      {showContact ? (
        <div className="report-footer-line">
          {[company.name, contact, company.registerInfo]
            .map((part) => part.trim())
            .filter(Boolean)
            .join(" · ")}
        </div>
      ) : null}
      {report.showDate ? (
        <div className="report-footer-line">Erstellt am {today}</div>
      ) : null}
      {showDisclaimer ? (
        <div className="report-footer-line">{report.disclaimerText}</div>
      ) : null}
    </footer>
  );
}
