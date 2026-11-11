import type { CompanySettings, ReportSettings } from "@/lib/profile/settings";
import { GROSS_AMOUNTS_NOTE } from "@/lib/config/texts";

/**
 * Fuß des gebrandeten Reports: Kontakt, Registerangaben, Datum, Brutto-Hinweis
 * (immer), Hinweistext. Fehlende Felder werden nicht gerendert. Wiederverwendbar für die
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
      <div className="report-footer-line">{GROSS_AMOUNTS_NOTE}</div>
      {showDisclaimer ? (
        <div className="report-footer-line">{report.disclaimerText}</div>
      ) : null}
    </footer>
  );
}
